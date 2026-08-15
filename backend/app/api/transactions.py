from fastapi import APIRouter, Request, HTTPException, status
from typing import List
from ..models.transaction import TransactionEvent
from ..models.audit import AuditEntry
from .websocket import manager

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("", status_code=status.HTTP_201_CREATED)
async def ingest_transaction(event: TransactionEvent, request: Request):
    """Ingest a single transaction event into the detection engine."""
    engine = request.app.state.state_engine
    result = engine.process_event(event)
    
    # Broadcast to websocket clients in real-time
    if result["status"] == "PROCESSED":
        await manager.broadcast({
            "type": "TRANSACTION_PROCESSED",
            "data": {
                "event": event.model_dump(),
                "was_late": result["was_late"],
                "interpolated_event": result["interpolated_event"].model_dump() if result["interpolated_event"] else None,
                "audit_entry": result["audit_entry"].model_dump() if result["audit_entry"] else None
            }
        })
        # If it was an anomaly, broadcast a separate alert
        if result["audit_entry"] and result["audit_entry"].decision == "FLAGGED":
            await manager.broadcast({
                "type": "ANOMALY_DETECTED",
                "data": result["audit_entry"].model_dump()
            })
            
        # Also broadcast current state updates for the account
        state = engine.get_state(event.account_id)
        if state:
            await manager.broadcast({
                "type": "STATE_UPDATED",
                "data": state.model_dump()
            })
    else:
        # For duplicates or rejected events, broadcast warning/rejection
        await manager.broadcast({
            "type": "TRANSACTION_REJECTED",
            "data": {
                "event": event.model_dump(),
                "reason": result.get("audit_entry").reasoning if result.get("audit_entry") else "Unknown reason"
            }
        })
        
    return result

@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def ingest_transaction_batch(events: List[TransactionEvent], request: Request):
    """Ingest a batch of transaction events."""
    engine = request.app.state.state_engine
    results = []
    
    for event in events:
        result = engine.process_event(event)
        results.append(result)
        
        # Broadcast each event
        if result["status"] == "PROCESSED":
            await manager.broadcast({
                "type": "TRANSACTION_PROCESSED",
                "data": {
                    "event": event.model_dump(),
                    "was_late": result["was_late"],
                    "interpolated_event": result["interpolated_event"].model_dump() if result["interpolated_event"] else None,
                    "audit_entry": result["audit_entry"].model_dump() if result["audit_entry"] else None
                }
            })
            if result["audit_entry"] and result["audit_entry"].decision == "FLAGGED":
                await manager.broadcast({
                    "type": "ANOMALY_DETECTED",
                    "data": result["audit_entry"].model_dump()
                })
            state = engine.get_state(event.account_id)
            if state:
                await manager.broadcast({
                    "type": "STATE_UPDATED",
                    "data": state.model_dump()
                })
                
    return {"processed_count": len(events), "results": results}

@router.get("")
async def get_all_transactions(request: Request):
    """Retrieve all processed transactions in the log."""
    engine = request.app.state.state_engine
    return engine.get_event_log()
