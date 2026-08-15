from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .core.state_engine import StateEngine
from .core.anomaly_detector import AnomalyDetector
from .core.audit_logger import AuditLogger
from .api import transactions, state, anomalies, audit, replay, websocket

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the core singletons
    detector = AnomalyDetector()
    logger = AuditLogger()
    engine = StateEngine(detector, logger)
    
    # Store them in the app state to share with request handlers
    app.state.anomaly_detector = detector
    app.state.audit_logger = logger
    app.state.state_engine = engine
    
    yield
    
    # Shutdown cleanup
    engine.reset()

app = FastAPI(
    title="Real-Time Financial Anomaly Detection Engine",
    description="A high-performance event-sourcing anomaly detector with retroactive replay capabilities.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend dashboard interactions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(transactions.router, prefix="/api")
app.include_router(state.router, prefix="/api")
app.include_router(anomalies.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(replay.router, prefix="/api")
app.include_router(websocket.router)  # Mounted directly for /ws/live

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "financial-anomaly-engine",
        "docs_url": "/docs"
    }
