# Walkthrough: Real-Time Financial Anomaly Detection Engine

We have successfully built and verified the Real-Time Financial Anomaly Detection Engine with temporal replay capabilities.

## Changes Made

### 1. Backend Core (FastAPI & NumPy)

- **State Reconstruction Engine** ([state_engine.py](file:///c:/Users/Falak/Desktop/MyOnsite/backend/app/core/state_engine.py)): Reconstructs consistent global balances chronologically. Corrects late-arriving events retroactively and generates warning warnings/placeholder events for telemetry gaps.
- **NumPy Anomaly Detector** ([anomaly_detector.py](file:///c:/Users/Falak/Desktop/MyOnsite/backend/app/core/anomaly_detector.py)): Evaluates transaction deviation scores using rolling Z-scores over sliding 10-minute windows. Handles zero standard deviation and boundary values exactly at the threshold.
- **Audit Logger** ([audit_logger.py](file:///c:/Users/Falak/Desktop/MyOnsite/backend/app/core/audit_logger.py)): Records decisions and allows on-demand JSON compliance export.
- **Replay Engine** ([replay_engine.py](file:///c:/Users/Falak/Desktop/MyOnsite/backend/app/core/replay_engine.py)): Performs deterministic simulation of transactions to guarantee identical audit logs and balance outcomes.
- **API and WebSockets** ([main.py](file:///c:/Users/Falak/Desktop/MyOnsite/backend/app/main.py)): Connects routers for REST requests and live WebSocket streaming updates to port `8000`.

### 2. Frontend Dashboard (React + Vite)

- **Interactive UI Components**: Displays real-time transaction feeds, account balance grids, and flagged anomaly alerts with custom drop-down inspect parameters.
- **Charts Visualization** ([StatsCharts.jsx](file:///c:/Users/Falak/Desktop/MyOnsite/frontend/src/components/StatsCharts.jsx)): Displays rolling averages and Z-scores side-by-side with a colored alert limit reference line.
- **Interactive Replays** ([ReplayControls.jsx](file:///c:/Users/Falak/Desktop/MyOnsite/frontend/src/components/ReplayControls.jsx)): Triggers preset fixtures or processes user-selected custom transaction JSON files directly in the browser.

---

## Verification & Automated Test Suite

We created 14 automated tests covering all PRD specifications. Run them via:

```bash
cd backend
pytest tests/ -v --tb=short
```

**Results:**

- **State Engine**: Verified duplicate rejection, transaction sorting, and retroactive recomputations.
- **Anomaly Detection**: Verified threshold boundaries, zero standard deviations, and small window edge cases.
- **Deterministic Replay**: Verified replaying twice yields identical states and trails.
- **Edge-case Fixtures**: Successfully replayed and verified all 5 fixture scenarios (`normal_flow`, `duplicate_events`, `late_arriving`, `missing_data`, `conflicting_threshold`).

All 14 tests pass successfully.
