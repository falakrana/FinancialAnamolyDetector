import pytest
from datetime import datetime, timezone
from app.core.anomaly_detector import AnomalyDetector
from app.models.transaction import TransactionEvent, TransactionType

def test_insufficient_history():
    detector = AnomalyDetector(threshold=3.0)
    event = TransactionEvent(
        id="t1", timestamp=datetime.now(timezone.utc), source="exchange-A",
        account_id="acc-1", amount=100.0, type=TransactionType.BUY
    )
    # Only 1 historical transaction
    history = [
        TransactionEvent(
            id="h1", timestamp=datetime.now(timezone.utc), source="exchange-A",
            account_id="acc-1", amount=90.0, type=TransactionType.BUY
        )
    ]
    result = detector.analyze(event, history)
    assert result.is_anomaly is False
    assert "Insufficient" in result.reasoning

def test_zero_std_no_anomaly():
    detector = AnomalyDetector(threshold=3.0)
    event = TransactionEvent(
        id="t1", timestamp=datetime.now(timezone.utc), source="exchange-A",
        account_id="acc-1", amount=100.0, type=TransactionType.BUY
    )
    # Historical values are all 100.0
    history = [
        TransactionEvent(
            id="h1", timestamp=datetime.now(timezone.utc), source="exchange-A",
            account_id="acc-1", amount=100.0, type=TransactionType.BUY
        ),
        TransactionEvent(
            id="h2", timestamp=datetime.now(timezone.utc), source="exchange-A",
            account_id="acc-1", amount=100.0, type=TransactionType.BUY
        )
    ]
    result = detector.analyze(event, history)
    assert result.is_anomaly is False
    assert result.rolling_std == 0.0
    assert result.z_score == 0.0

def test_zero_std_with_anomaly():
    detector = AnomalyDetector(threshold=3.0)
    event = TransactionEvent(
        id="t1", timestamp=datetime.now(timezone.utc), source="exchange-A",
        account_id="acc-1", amount=101.0, type=TransactionType.BUY
    )
    # Historical values are all 100.0, but event is 101.0
    history = [
        TransactionEvent(
            id="h1", timestamp=datetime.now(timezone.utc), source="exchange-A",
            account_id="acc-1", amount=100.0, type=TransactionType.BUY
        ),
        TransactionEvent(
            id="h2", timestamp=datetime.now(timezone.utc), source="exchange-A",
            account_id="acc-1", amount=100.0, type=TransactionType.BUY
        )
    ]
    result = detector.analyze(event, history)
    assert result.is_anomaly is True
    assert result.rolling_std == 0.0
    assert result.z_score == 999.9

def test_threshold_boundary():
    # Mean = 150, Std = 50. Dev = 150. Z-score = 3.0.
    detector = AnomalyDetector(threshold=3.0)
    event = TransactionEvent(
        id="t1", timestamp=datetime.now(timezone.utc), source="exchange-A",
        account_id="acc-1", amount=300.0, type=TransactionType.BUY
    )
    history = [
        TransactionEvent(id="h1", timestamp=datetime.now(timezone.utc), source="A", account_id="1", amount=100.0, type="buy"),
        TransactionEvent(id="h2", timestamp=datetime.now(timezone.utc), source="A", account_id="1", amount=200.0, type="buy"),
        TransactionEvent(id="h3", timestamp=datetime.now(timezone.utc), source="A", account_id="1", amount=100.0, type="buy"),
        TransactionEvent(id="h4", timestamp=datetime.now(timezone.utc), source="A", account_id="1", amount=200.0, type="buy")
    ]
    result = detector.analyze(event, history)
    # Z-score exactly 3.0 should be marked anomalous since z_score >= threshold
    assert result.z_score == 3.0
    assert result.is_anomaly is True
