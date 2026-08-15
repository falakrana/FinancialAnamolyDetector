from fastapi import APIRouter, Request, HTTPException, status
from ..models.state import AccountState

router = APIRouter(prefix="/state", tags=["Account State"])

@router.get("")
async def get_global_state(request: Request):
    """Get the current state (balances, updates) of all accounts."""
    engine = request.app.state.state_engine
    return engine.get_global_state()

@router.get("/{account_id}")
async def get_account_state(account_id: str, request: Request):
    """Get the current state of a specific account."""
    engine = request.app.state.state_engine
    state = engine.get_state(account_id)
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account '{account_id}' not found."
        )
    return state
