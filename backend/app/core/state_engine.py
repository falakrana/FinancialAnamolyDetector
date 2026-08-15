from typing import Dict, List, Set, Tuple, Optional, Any
from datetime import datetime, timedelta
import bisect
import uuid
import numpy as np
from ..models.transaction import TransactionEvent, TransactionType
from ..models.state import AccountState
from ..models.audit import AuditEntry, AnomalyResult
from ..config import settings
from .anomaly_detector import AnomalyDetector
from .audit_logger import AuditLogger
from ..utils.helpers import generate_id

class StateEngine:
    def __init__(self, anomaly_detector: AnomalyDetector, audit_logger: AuditLogger):
        self.anomaly_detector = anomaly_detector
        self.audit_logger = audit_logger
        
        self._event_log: List[TransactionEvent] = []
        self._seen_ids: Set[str] = set()
        
        # Current materialized state caches
        self._account_balances: Dict[str, float] = {}
        self._account_txn_counts: Dict[str, int] = {}
        self._account_last_updated: Dict[str, datetime] = {}

    def _get_sort_key(self, event: TransactionEvent) -> Tuple[datetime, int, str]:
        """
        Generate a sorting key for events to ensure deterministic ordering.
        Order by: timestamp ascending, source reliability ranking descending, event ID ascending.
        """
        reliability = settings.SOURCE_RELIABILITY_RANKING.get(event.source, 0)
        # We invert reliability because list sorts in ascending order, but we want higher reliability first
        return (event.timestamp, -reliability, event.id)

    def _insert_event_sorted(self, event: TransactionEvent) -> int:
        """Insert an event into the chronological event log and return its index."""
        # Find correct index using the sort key
        keys = [self._get_sort_key(e) for e in self._event_log]
        target_key = self._get_sort_key(event)
        idx = bisect.bisect_left(keys, target_key)
        self._event_log.insert(idx, event)
        return idx

    def _adjust_balance(self, current_balance: float, amount: float, txn_type: TransactionType) -> float:
        """Calculate the new balance based on transaction type."""
        if txn_type in (TransactionType.DEPOSIT, TransactionType.SELL, TransactionType.INTERPOLATED):
            return round(current_balance + amount, 2)
        elif txn_type in (TransactionType.WITHDRAWAL, TransactionType.BUY):
            return round(current_balance - amount, 2)
        return current_balance

    def process_event(self, event: TransactionEvent) -> Dict[str, Any]:
        """
        Process a single transaction event.
        Handles duplicates, checks for missing data (interpolates if necessary),
        inserts the event chronologically, and triggers state updates/retroactive recomputations.
        """
        # 1. Deduplication Check
        if event.id in self._seen_ids:
            current_bal = self._account_balances.get(event.account_id, 0.0)
            state_snap = {
                "account_id": event.account_id,
                "balance": current_bal,
                "last_updated": self._account_last_updated.get(event.account_id, event.timestamp),
                "transaction_count": self._account_txn_counts.get(event.account_id, 0)
            }
            
            audit_entry = AuditEntry(
                audit_id=generate_id("aud-dup"),
                event_id=event.id,
                timestamp=datetime.utcnow(),
                action="DUPLICATE_REJECTED",
                state_before=state_snap,
                state_after=state_snap,
                anomaly_result=None,
                decision="REJECTED",
                reasoning=f"Event ID '{event.id}' has already been processed."
            )
            self.audit_logger.log(audit_entry)
            return {
                "status": "REJECTED_DUPLICATE",
                "event": event,
                "audit_entry": audit_entry
            }

        # Mark ID as seen
        self._seen_ids.add(event.id)

        # 2. Check for missing data (gap detection) before inserting the new event
        # Find the chronologically preceding event for this account
        account_events_before = [
            e for e in self._event_log 
            if e.account_id == event.account_id and e.timestamp < event.timestamp
        ]
        
        interpolated_event = None
        if account_events_before:
            prev_event = account_events_before[-1]
            time_gap = event.timestamp - prev_event.timestamp
            gap_threshold = timedelta(minutes=settings.MISSING_DATA_THRESHOLD_MINUTES)
            
            if time_gap > gap_threshold:
                # Missing data gap detected, create an interpolated event
                interpolated_id = f"interpolated-{event.id}"
                interpolated_ts = prev_event.timestamp + (time_gap / 2)
                
                # Determine amount for the interpolated event (rolling mean of last 10 minutes prior to interpolated timestamp)
                window_start = interpolated_ts - timedelta(minutes=settings.ROLLING_WINDOW_MINUTES)
                prior_amounts = [
                    e.amount for e in account_events_before 
                    if window_start <= e.timestamp < interpolated_ts
                ]
                
                interpolated_amount = round(float(np.mean(prior_amounts)), 2) if prior_amounts else prev_event.amount
                
                interpolated_event = TransactionEvent(
                    id=interpolated_id,
                    timestamp=interpolated_ts,
                    source="reconstructed",
                    account_id=event.account_id,
                    amount=interpolated_amount,
                    type=TransactionType.INTERPOLATED,
                    metadata={"reason": "Interpolated missing transaction due to telemetry gap"}
                )
                
                self._seen_ids.add(interpolated_id)
                self._insert_event_sorted(interpolated_event)

        # 3. Insert the new event
        idx = self._insert_event_sorted(event)
        
        # Check if the new event was inserted in the middle of the log (late-arriving)
        # If the index is not the last event for this account, it is late-arriving.
        account_events_after = [
            e for e in self._event_log[idx+1:] 
            if e.account_id == event.account_id
        ]
        was_late = len(account_events_after) > 0

        # 4. Trigger recomputation of the state from the point of insertion
        self._recompute_account_state(event.account_id)

        # Retrieve the generated audit entry for this event
        audit_trail = self.audit_logger.get_trail_for_account(event.account_id)
        matching_audits = [a for a in audit_trail if a.event_id == event.id]
        audit_entry = matching_audits[-1] if matching_audits else None

        return {
            "status": "PROCESSED",
            "was_late": was_late,
            "interpolated_event": interpolated_event,
            "audit_entry": audit_entry
        }

    def _recompute_account_state(self, account_id: str) -> None:
        """Recompute the balance, rolling window statistics, and anomaly decisions for an account from scratch."""
        # Reset state cache for this account
        balance = 0.0
        txn_count = 0
        last_updated = None

        # Filter events for this account
        account_events = [e for e in self._event_log if e.account_id == account_id]

        for i, event in enumerate(account_events):
            # Calculate rolling window: events in the index range [0, i) within the last 10 minutes
            window_start = event.timestamp - timedelta(minutes=settings.ROLLING_WINDOW_MINUTES)
            rolling_window = [
                account_events[j] for j in range(i)
                if window_start <= account_events[j].timestamp
            ]

            # Perform Anomaly Detection
            anomaly_result = self.anomaly_detector.analyze(event, rolling_window)

            state_before = {
                "account_id": account_id,
                "balance": balance,
                "last_updated": last_updated,
                "transaction_count": txn_count
            }

            # Update state values
            balance = self._adjust_balance(balance, event.amount, event.type)
            txn_count += 1
            last_updated = event.timestamp

            state_after = {
                "account_id": account_id,
                "balance": balance,
                "last_updated": last_updated,
                "transaction_count": txn_count
            }

            # Log audit entry
            action = "PROCESSED"
            if event.type == TransactionType.INTERPOLATED:
                action = "RECONSTRUCTED_GAP"
            elif i < len(account_events) - 1:
                # If we are reprocessing this and it's not the final event in the log, it had a retroactive correction
                action = "RETROACTIVE_UPDATE"
                
            decision = "FLAGGED" if anomaly_result.is_anomaly else "ACCEPTED"
            reasoning = "Transaction analyzed."
            if anomaly_result.is_anomaly:
                reasoning = f"Anomaly flagged: {anomaly_result.reasoning}"

            audit_entry = AuditEntry(
                audit_id=generate_id("aud"),
                event_id=event.id,
                timestamp=datetime.utcnow(),
                action=action,
                state_before=state_before,
                state_after=state_after,
                anomaly_result=anomaly_result,
                decision=decision,
                reasoning=reasoning
            )
            self.audit_logger.log(audit_entry)

        # Cache the final materialized state
        if account_events:
            self._account_balances[account_id] = balance
            self._account_txn_counts[account_id] = txn_count
            self._account_last_updated[account_id] = last_updated

    def get_state(self, account_id: str) -> Optional[AccountState]:
        """Fetch the current materialized state for an account."""
        if account_id not in self._account_balances:
            return None
        return AccountState(
            account_id=account_id,
            balance=self._account_balances[account_id],
            last_updated=self._account_last_updated[account_id],
            transaction_count=self._account_txn_counts[account_id]
        )

    def get_global_state(self) -> Dict[str, AccountState]:
        """Fetch the current materialized state of all accounts."""
        return {
            account_id: self.get_state(account_id)
            for account_id in self._account_balances
        }

    def get_event_log(self) -> List[TransactionEvent]:
        """Get the full list of events sorted chronologically."""
        return list(self._event_log)

    def reset(self) -> None:
        """Reset the engine state."""
        self._event_log.clear()
        self._seen_ids.clear()
        self._account_balances.clear()
        self._account_txn_counts.clear()
        self._account_last_updated.clear()
        self.audit_logger.reset()
