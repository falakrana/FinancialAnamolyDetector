from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class AnomalyResult(BaseModel):
    is_anomaly: bool = Field(..., description="Whether the event was classified as an anomaly")
    z_score: Optional[float] = Field(default=None, description="Calculated Z-score of the event amount")
    threshold: float = Field(..., description="The Z-score threshold used for classification")
    rolling_mean: Optional[float] = Field(default=None, description="Rolling mean of transaction amounts within the window")
    rolling_std: Optional[float] = Field(default=None, description="Rolling standard deviation within the window")
    reasoning: str = Field(..., description="Text explanation of the anomaly decision")

class AuditEntry(BaseModel):
    audit_id: str = Field(..., description="Unique log identifier")
    event_id: str = Field(..., description="ID of the processed transaction event")
    timestamp: datetime = Field(..., description="Timestamp of when the audit log was recorded")
    action: str = Field(..., description="Description of action taken (e.g. PROCESSED, DUPLICATE_REJECTED, LATE_INSERT)")
    state_before: Dict[str, Any] = Field(..., description="Account state snapshot before processing")
    state_after: Dict[str, Any] = Field(..., description="Account state snapshot after processing")
    anomaly_result: Optional[AnomalyResult] = Field(default=None, description="Results of the anomaly detection analysis")
    decision: str = Field(..., description="Final processing decision (e.g., ACCEPTED, FLAGGED, REJECTED)")
    reasoning: str = Field(..., description="General explanation of the decision")
