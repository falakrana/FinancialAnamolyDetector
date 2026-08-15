from typing import List, Dict, Any, Tuple
from datetime import datetime
from ..models.transaction import TransactionEvent
from ..models.state import AccountState
from ..models.audit import AuditEntry
from .state_engine import StateEngine
from .anomaly_detector import AnomalyDetector
from .audit_logger import AuditLogger
from ..config import settings

class ReplayEngine:
    def __init__(self):
        pass

    def _get_sort_key(self, event: TransactionEvent) -> Tuple[datetime, int, str]:
        """Same sorting logic as the state engine to maintain consistency."""
        reliability = settings.SOURCE_RELIABILITY_RANKING.get(event.source, 0)
        return (event.timestamp, -reliability, event.id)

    def replay(self, events: List[TransactionEvent]) -> Dict[str, Any]:
        """
        Deterministic replay of a sequence of transaction events.
        Instantiates temporary clean engines to guarantee no side-effects.
        """
        # Sort events chronologically to guarantee deterministic order
        sorted_events = sorted(events, key=self._get_sort_key)

        # Instantiate a clean engine environment
        temp_detector = AnomalyDetector()
        temp_logger = AuditLogger()
        temp_engine = StateEngine(temp_detector, temp_logger)

        # Process each event sequentially
        processed_results = []
        for event in sorted_events:
            res = temp_engine.process_event(event)
            processed_results.append(res)

        # Gather final states and audit trail
        final_states = temp_engine.get_global_state()
        audit_trail = temp_logger.get_trail()

        return {
            "final_states": final_states,
            "audit_trail": audit_trail,
            "event_count": len(sorted_events),
            "processed_results": processed_results
        }
