from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Dict
from .transaction import TransactionEvent

class AccountState(BaseModel):
    account_id: str = Field(..., description="The unique identifier for the account")
    balance: float = Field(default=0.0, description="The current account balance")
    last_updated: datetime = Field(..., description="Timestamp of the last transaction that affected this balance")
    transaction_count: int = Field(default=0, description="Total number of transactions processed for this account")

class GlobalState(BaseModel):
    accounts: Dict[str, AccountState] = Field(default_factory=dict, description="Map of account ID to AccountState")
