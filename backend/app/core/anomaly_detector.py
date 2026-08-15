import numpy as np
from typing import List, Optional
from ..models.transaction import TransactionEvent
from ..models.audit import AnomalyResult
from ..config import settings

class AnomalyDetector:
    def __init__(self, threshold: Optional[float] = None):
        self.threshold = threshold if threshold is not None else settings.ANOMALY_Z_SCORE_THRESHOLD

    def analyze(self, event: TransactionEvent, history: List[TransactionEvent]) -> AnomalyResult:
        """
        Analyze a transaction event against its historical rolling window.
        
        Args:
            event: The transaction event to evaluate.
            history: List of historical transaction events within the 10-minute window prior to the event.
            
        Returns:
            AnomalyResult indicating whether the transaction is an anomaly and the computed Z-score.
        """
        # If there are fewer than 2 items in history, we cannot establish a distribution (std requires N>=2)
        if len(history) < 2:
            return AnomalyResult(
                is_anomaly=False,
                z_score=0.0,
                threshold=self.threshold,
                rolling_mean=float(np.mean([event.amount] + [h.amount for h in history])) if history else event.amount,
                rolling_std=0.0,
                reasoning=f"Insufficient historical data in the rolling window (found {len(history)} events, min 2 required)."
            )

        amounts = np.array([h.amount for h in history])
        mean = float(np.mean(amounts))
        std = float(np.std(amounts))

        # Handle case where all historical elements are identical (std dev is 0)
        if std == 0.0:
            if event.amount == mean:
                return AnomalyResult(
                    is_anomaly=False,
                    z_score=0.0,
                    threshold=self.threshold,
                    rolling_mean=mean,
                    rolling_std=0.0,
                    reasoning="Standard deviation is 0.0. Transaction amount matches the flat historical average."
                )
            else:
                # Any deviation from a flat line is anomalous
                return AnomalyResult(
                    is_anomaly=True,
                    z_score=999.9,  # Represent extreme deviation
                    threshold=self.threshold,
                    rolling_mean=mean,
                    rolling_std=0.0,
                    reasoning=f"Standard deviation is 0.0. Transaction amount {event.amount} deviates from the flat historical average of {mean}."
                )

        z_score = abs(event.amount - mean) / std
        is_anomaly = z_score >= self.threshold

        if is_anomaly:
            reasoning = f"Z-score {z_score:.2f} meets or exceeds the threshold of {self.threshold:.2f} (rolling mean: {mean:.2f}, std: {std:.2f})."
        else:
            reasoning = f"Z-score {z_score:.2f} is below the threshold of {self.threshold:.2f} (rolling mean: {mean:.2f}, std: {std:.2f})."

        return AnomalyResult(
            is_anomaly=is_anomaly,
            z_score=z_score,
            threshold=self.threshold,
            rolling_mean=mean,
            rolling_std=std,
            reasoning=reasoning
        )
