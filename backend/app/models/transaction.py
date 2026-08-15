from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

class TransactionType(str, Enum):
    BUY = "buy"
    SELL = "sell"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    INTERPOLATED = "interpolated"  # for reconstructed missing events

class TransactionEvent(BaseModel):
    id: str = Field(..., description="Unique transaction event ID")
    timestamp: datetime = Field(..., description="ISO 8601 UTC timestamp of the transaction")
    source: str = Field(..., description="The source system of the transaction event")
    account_id: str = Field(..., description="Target account identifier")
    amount: float = Field(..., description="Transaction monetary amount (must be positive)")
    type: TransactionType = Field(..., description="Transaction type: buy, sell, deposit, withdrawal, interpolated")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Arbitrary metadata dictionary")

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        return v
