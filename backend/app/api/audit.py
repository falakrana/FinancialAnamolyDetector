from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import FileResponse
import os

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("")
async def get_audit_trail(request: Request):
    """Retrieve the full system audit trail."""
    logger = request.app.state.audit_logger
    return logger.get_trail()

@router.get("/export")
async def export_audit_trail(request: Request):
    """Export the current audit trail to a local JSON file and return it."""
    logger = request.app.state.audit_logger
    
    # Establish local export path
    export_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "output"))
    export_path = os.path.join(export_dir, "audit_trail.json")
    
    logger.export_json(export_path)
    
    if not os.path.exists(export_path):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate the audit trail file."
        )
        
    return FileResponse(
        path=export_path, 
        media_type="application/json", 
        filename="audit_trail.json"
    )

@router.get("/{account_id}")
async def get_account_audit_trail(account_id: str, request: Request):
    """Retrieve the audit trail for a specific account."""
    logger = request.app.state.audit_logger
    return logger.get_trail_for_account(account_id)
