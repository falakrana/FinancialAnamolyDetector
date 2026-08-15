from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: dict):
        # Serialize to json string
        payload = json.dumps(message, default=str)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                # Connection might have died, clean it up
                self.disconnect(connection)

manager = ConnectionManager()
router = APIRouter(prefix="/ws", tags=["WebSockets"])

@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Just keep the connection alive by waiting for client messages (if any)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
