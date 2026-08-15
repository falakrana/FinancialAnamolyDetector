import pytest
import os
import json
from datetime import datetime
from app.core.state_engine import StateEngine
from app.core.anomaly_detector import AnomalyDetector
from app.core.audit_logger import AuditLogger
from app.models.transaction import TransactionEvent
from app.utils.helpers import parse_iso_datetime

def get_fixture_events(fixture_name: str):
    fixtures_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "fixtures"))
    fixture_path = os.path.join(fixtures_dir, fixture_name)
    with open(fixture_path, "r") as f:
        data = json.load(f)
    
    events = []
    for item in data:
        events.append(TransactionEvent(
            id=item["id"],
            timestamp=parse_iso_datetime(item["timestamp"]),
            source=item["source"],
            account_id=item["account_id"],
            amount=item["amount"],
            type=item["type"],
            metadata=item.get("metadata", {})
        ))
    return events

@pytest.fixture
def clean_engine():
    return StateEngine(AnomalyDetector(), AuditLogger())

def test_fixture_normal_flow(clean_engine):
    engine = clean_engine
    events = get_fixture_events("01_normal_flow.json")
    
    for e in events:
        engine.process_event(e)
        
    state = engine.get_state("acc-100")
    # Deposit 50000, buy 150, 155, 145, 160, 150 = 50000 - 760 = 49240.0
    assert state.balance == 49240.0
    assert state.transaction_count == 6

def test_fixture_duplicate_events(clean_engine):
    engine = clean_engine
    events = get_fixture_events("02_duplicate_events.json")
    
    results = [engine.process_event(e) for e in events]
    
    state = engine.get_state("acc-200")
    # Deposit 10000, buy 250, buy 260 = 9490.0
    assert state.balance == 9490.0
    assert state.transaction_count == 3
    
    # Check that duplicates were rejected
    rejected_count = sum(1 for r in results if r["status"] == "REJECTED_DUPLICATE")
    assert rejected_count == 2

def test_fixture_late_arriving(clean_engine):
    engine = clean_engine
    events = get_fixture_events("03_late_arriving.json")
    
    results = [engine.process_event(e) for e in events]
    
    # Last event in list is 'late-002' which has timestamp 10:21:00 (middle of others)
    # It must trigger was_late = True
    assert results[-1]["was_late"] is True
    
    state = engine.get_state("acc-300")
    # 20000 - 500 - 510 - 400 = 18590.0
    assert state.balance == 18590.0
    assert state.transaction_count == 4

def test_fixture_missing_data(clean_engine):
    engine = clean_engine
    events = get_fixture_events("04_missing_data.json")
    
    results = [engine.process_event(e) for e in events]
    
    # Transaction gap: T1=10:31:00, T2=10:40:00 (9 mins > 5 mins)
    # This should trigger an interpolated event during the 10:40:00 processing
    assert results[-1]["interpolated_event"] is not None
    
    state = engine.get_state("acc-400")
    # Deposit 10000, buy 100, interpolated (adds amount based on type deposit/interpolated: mean of 10000 and 100 = 5050.0), buy 150
    # Let's verify balance:
    # 1. Deposit 10000 (+10000)
    # 2. Buy 100 (-100) -> Bal = 9900
    # 3. Interpolated event created at 10:35:30 with amount = mean of history (10000 and 100 = 5050.0). Since it's interpolated, we add it -> 9900 + 5050 = 14950
    # 4. Buy 150 (-150) -> Bal = 14800
    assert state.balance == 14800.0
    assert state.transaction_count == 4

def test_fixture_conflicting_threshold(clean_engine):
    engine = clean_engine
    events = get_fixture_events("05_conflicting_threshold.json")
    
    from app.config import settings
    original_threshold = settings.MISSING_DATA_THRESHOLD_MINUTES
    settings.MISSING_DATA_THRESHOLD_MINUTES = 60.0
    try:
        for e in events:
            engine.process_event(e)
    finally:
        settings.MISSING_DATA_THRESHOLD_MINUTES = original_threshold
        
    state = engine.get_state("acc-500")
    # Two deposits of 20000 = 40000.
    # Four buys: 100, 200, 100, 200 = 600.
    # One final buy of 300 = 300.
    # Total balance = 40000 - 900 = 39100.0
    assert state.balance == 39100.0
    
    # Check conflicting event ordering:
    # conflict-001 (internal-log, rank 1) vs conflict-002 (exchange-A, rank 3) at 10:50:00
    # Because exchange-A has higher rank, conflict-002 must be sorted BEFORE conflict-001 in event log!
    log = engine.get_event_log()
    assert log[0].id == "conflict-002"
    assert log[1].id == "conflict-001"
    
    # Check that final event (conflict-007) of 300 triggers an anomaly
    # Rolling window prior to 10:53:00 has buys: 100, 200, 100, 200. Mean = 150, Std = 50.
    # Z-score of 300 = (300 - 150) / 50 = 3.0.
    # Threshold = 3.0. Z-score 3.0 >= 3.0, so it must be an anomaly.
    audit_trail = engine.audit_logger.get_trail_for_account("acc-500")
    last_audit = [a for a in audit_trail if a.event_id == "conflict-007"][0]
    assert last_audit.anomaly_result.is_anomaly is True
    assert last_audit.anomaly_result.z_score == 3.0
    assert last_audit.decision == "FLAGGED"
