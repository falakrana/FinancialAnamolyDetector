import json
import os
from typing import List, Dict, Optional
from datetime import datetime
from ..models.audit import AuditEntry
from ..utils.helpers import format_iso_datetime

class AuditLogger:
    def __init__(self):
        self._audit_trail: List[AuditEntry] = []
        self._entry_map: Dict[str, int] = {}  # event_id -> index in _audit_trail for O(1) updates

    def log(self, entry: AuditEntry) -> None:
        """Log a new audit entry or update an existing one if it already exists (retroactive recomputation)."""
        event_id = entry.event_id
        if event_id in self._entry_map:
            idx = self._entry_map[event_id]
            self._audit_trail[idx] = entry
        else:
            self._entry_map[event_id] = len(self._audit_trail)
            self._audit_trail.append(entry)

    def get_trail(self) -> List[AuditEntry]:
        """Return the complete audit trail ordered by processing sequence."""
        return list(self._audit_trail)

    def get_trail_for_account(self, account_id: str) -> List[AuditEntry]:
        """Return the audit trail for a specific account."""
        return [entry for entry in self._audit_trail if entry.state_after.get("account_id") == account_id]

    def get_trail_between(self, start: datetime, end: datetime) -> List[AuditEntry]:
        """Return audit entries recorded between start and end timestamps."""
        return [entry for entry in self._audit_trail if start <= entry.timestamp <= end]

    def reset(self) -> None:
        """Clear all audit logs."""
        self._audit_trail.clear()
        self._entry_map.clear()

    def export_json(self, filepath: str) -> None:
        """Export the audit trail as a JSON file, creating parent directories if necessary."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Convert models to dicts
        serializable_trail = [entry.model_dump() for entry in self._audit_trail]
        
        # Helper to convert datetimes in the dict to string format
        def json_serial(obj):
            if isinstance(obj, datetime):
                return format_iso_datetime(obj)
            raise TypeError(f"Type {type(obj)} not serializable")

        with open(filepath, "w") as f:
            json.dump(serializable_trail, f, default=json_serial, indent=2)
