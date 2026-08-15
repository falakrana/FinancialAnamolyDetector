from fastapi import APIRouter, Request, HTTPException, status
from typing import List, Dict, Any
import os
import json
from ..models.transaction import TransactionEvent
from ..core.replay_engine import ReplayEngine
from ..utils.helpers import parse_iso_datetime

router = APIRouter(prefix="/replay", tags=["Temporal Replay"])

@router.post("")
async def replay_events(events: List[TransactionEvent]):
    """Replay a provided sequence of events deterministically and return final states and audit log."""
    engine = ReplayEngine()
    result = engine.replay(events)
    # Convert model types in response
    return {
        "event_count": result["event_count"],
        "final_states": {acc_id: state.model_dump() for acc_id, state in result["final_states"].items()},
        "audit_trail": [entry.model_dump() for entry in result["audit_trail"]]
    }

@router.post("/fixture/{name}")
async def replay_fixture(name: str):
    """Load a fixture JSON file and execute a deterministic replay on it."""
    # Ensure file name is secure (no directory traversal)
    safe_name = os.path.basename(name)
    if not safe_name.endswith(".json"):
        safe_name += ".json"
        
    fixtures_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "fixtures"))
    fixture_path = os.path.join(fixtures_dir, safe_name)
    
    if not os.path.exists(fixture_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Fixture '{name}' not found."
        )
        
    try:
        with open(fixture_path, "r") as f:
            raw_data = json.load(f)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading fixture: {str(e)}"
        )
        
    # Map raw dictionary data into TransactionEvent models
    events = []
    for item in raw_data:
        try:
            # Parse timestamp if it's a string
            event = TransactionEvent(
                id=item["id"],
                timestamp=parse_iso_datetime(item["timestamp"]),
                source=item["source"],
                account_id=item["account_id"],
                amount=item["amount"],
                type=item["type"],
                metadata=item.get("metadata", {})
            )
            events.append(event)
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid event in fixture: {str(err)}. Item: {item}"
            )
            
    engine = ReplayEngine()
    result = engine.replay(events)
    
    return {
        "fixture_name": name,
        "event_count": result["event_count"],
        "final_states": {acc_id: state.model_dump() for acc_id, state in result["final_states"].items()},
        "audit_trail": [entry.model_dump() for entry in result["audit_trail"]]
    }

@router.post("/reset")
async def reset_engine(request: Request):
    """Reset the global state engine and audit log."""
    engine = request.app.state.state_engine
    engine.reset()
    return {"message": "State engine and audit log reset successfully."}
