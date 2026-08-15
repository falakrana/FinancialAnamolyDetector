import pytest
from datetime import datetime, timedelta, timezone
from app.core.state_engine import StateEngine
from app.core.anomaly_detector import AnomalyDetector
from app.core.audit_logger import AuditLogger
from app.models.transaction import TransactionEvent, TransactionType

@pytest.fixture
def clean_engine():
    detector = AnomalyDetector()
    logger = AuditLogger()
    return StateEngine(detector, logger)

def test_deduplication(clean_engine):
    engine = clean_engine
    base_time = datetime.now(timezone.utc)
    
    event1 = TransactionEvent(
        id="txn-101", timestamp=base_time, source="exchange-A",
        account_id="acc-x", amount=100.0, type=TransactionType.DEPOSIT
    )
    event2 = TransactionEvent(
        id="txn-101", timestamp=base_time, source="exchange-A",
        account_id="acc-x", amount=100.0, type=TransactionType.DEPOSIT
    )
    
    res1 = engine.process_event(event1)
    res2 = engine.process_event(event2)
    
    assert res1["status"] == "PROCESSED"
    assert res2["status"] == "REJECTED_DUPLICATE"
    assert engine.get_state("acc-x").balance == 100.0
    assert engine.get_state("acc-x").transaction_count == 1

def test_late_arriving_recomputation(clean_engine):
    engine = clean_engine
    base_time = datetime.now(timezone.utc)
    
    # Ingest normal sequential events
    # T0: Deposit 1000
    e1 = TransactionEvent(
        id="t1", timestamp=base_time, source="exchange-A",
        account_id="acc-x", amount=1000.0, type=TransactionType.DEPOSIT
    )
    # T2: Buy 200 (balance should be 800)
    e3 = TransactionEvent(
        id="t3", timestamp=base_time + timedelta(seconds=20), source="exchange-B",
        account_id="acc-x", amount=200.0, type=TransactionType.BUY
    )
    
    engine.process_event(e1)
    engine.process_event(e3)
    
    assert engine.get_state("acc-x").balance == 800.0
    
    # T1: Late event (Buy 100, timestamp between T0 and T2)
    # Correct final balance should be: 1000 - 100 - 200 = 700
    e2 = TransactionEvent(
        id="t2", timestamp=base_time + timedelta(seconds=10), source="exchange-A",
        account_id="acc-x", amount=100.0, type=TransactionType.BUY
    )
    
    res = engine.process_event(e2)
    assert res["was_late"] is True
    assert engine.get_state("acc-x").balance == 700.0
    assert engine.get_state("acc-x").transaction_count == 3
    
    # Verify the chronological logs
    log = engine.get_event_log()
    assert log[0].id == "t1"
    assert log[1].id == "t2"
    assert log[2].id == "t3"
