import pytest
import os
import json
from datetime import datetime, timezone
from app.core.audit_logger import AuditLogger
from app.models.audit import AuditEntry, AnomalyResult

def test_audit_log_append_and_update(tmp_path):
    logger = AuditLogger()
    
    entry1 = AuditEntry(
        audit_id="aud-1", event_id="txn-1", timestamp=datetime.now(timezone.utc),
        action="PROCESSED", state_before={"balance": 0.0}, state_after={"balance": 100.0},
        anomaly_result=None, decision="ACCEPTED", reasoning="OK"
    )
    
    logger.log(entry1)
    assert len(logger.get_trail()) == 1
    
    # Update for the same event (retroactive)
    entry1_updated = AuditEntry(
        audit_id="aud-1", event_id="txn-1", timestamp=datetime.now(timezone.utc),
        action="RETROACTIVE_UPDATE", state_before={"balance": 0.0}, state_after={"balance": 120.0},
        anomaly_result=None, decision="ACCEPTED", reasoning="Adjusted balance"
    )
    
    logger.log(entry1_updated)
    trail = logger.get_trail()
    assert len(trail) == 1
    assert trail[0].action == "RETROACTIVE_UPDATE"
    assert trail[0].state_after["balance"] == 120.0

def test_audit_log_export(tmp_path):
    logger = AuditLogger()
    entry = AuditEntry(
        audit_id="aud-1", event_id="txn-1", timestamp=datetime.now(timezone.utc),
        action="PROCESSED", state_before={"balance": 0.0}, state_after={"balance": 100.0},
        anomaly_result=None, decision="ACCEPTED", reasoning="OK"
    )
    logger.log(entry)
    
    export_file = os.path.join(tmp_path, "audit.json")
    logger.export_json(export_file)
    
    assert os.path.exists(export_file)
    with open(export_file, "r") as f:
        data = json.load(f)
    assert len(data) == 1
    assert data[0]["event_id"] == "txn-1"
