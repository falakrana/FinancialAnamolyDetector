import pytest
from datetime import datetime, timedelta, timezone
from app.core.replay_engine import ReplayEngine
from app.models.transaction import TransactionEvent, TransactionType

def test_deterministic_replay():
    base_time = datetime.now(timezone.utc)
    events = [
        TransactionEvent(id="e1", timestamp=base_time, source="exchange-A", account_id="acc-1", amount=1000.0, type=TransactionType.DEPOSIT),
        TransactionEvent(id="e3", timestamp=base_time + timedelta(seconds=20), source="exchange-B", account_id="acc-1", amount=100.0, type=TransactionType.BUY),
        TransactionEvent(id="e2", timestamp=base_time + timedelta(seconds=10), source="exchange-A", account_id="acc-1", amount=50.0, type=TransactionType.SELL)
    ]
    
    engine = ReplayEngine()
    result1 = engine.replay(events)
    result2 = engine.replay(events)
    
    # Verify outputs are identical
    assert result1["event_count"] == 3
    assert result2["event_count"] == 3
    
    # State balances must be equal (1000 + 50 - 100 = 950)
    assert result1["final_states"]["acc-1"].balance == 950.0
    assert result2["final_states"]["acc-1"].balance == 950.0
    
    # Verify audit trails match exactly
    trail1 = result1["audit_trail"]
    trail2 = result2["audit_trail"]
    assert len(trail1) == 3
    assert len(trail2) == 3
    
    for i in range(3):
        assert trail1[i].event_id == trail2[i].event_id
        assert trail1[i].state_after["balance"] == trail2[i].state_after["balance"]
