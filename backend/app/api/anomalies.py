from fastapi import APIRouter, Request, HTTPException, status

router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

@router.get("")
async def get_all_anomalies(request: Request):
    """Retrieve all flagged anomalies across all accounts."""
    logger = request.app.state.audit_logger
    trail = logger.get_trail()
    anomalies = [
        entry for entry in trail 
        if entry.anomaly_result and entry.anomaly_result.is_anomaly
    ]
    return anomalies

@router.get("/{account_id}")
async def get_account_anomalies(account_id: str, request: Request):
    """Retrieve flagged anomalies for a specific account."""
    logger = request.app.state.audit_logger
    trail = logger.get_trail_for_account(account_id)
    anomalies = [
        entry for entry in trail 
        if entry.anomaly_result and entry.anomaly_result.is_anomaly
    ]
    return anomalies
