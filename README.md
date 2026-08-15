# Real-Time Financial Anomaly Detection Engine

A high-performance anomaly detection system for detecting financial trading irregularities. Built with **FastAPI**, **NumPy**, and **React**, featuring temporal state replay and full audit compliance.

---

## Overview

Ingests asynchronous, out-of-order transaction records and:

- **Reconstructs Consistent State**: Handles late-arriving events, duplicates, and missing data
- **Detects Anomalies**: NumPy-based Z-score analysis on 10-minute rolling windows
- **Maintains Audit Trail**: Records every state transition and decision
- **Deterministic Replay**: Reproduces historical states identically for verification

### Key Features

- Real-time WebSocket streaming  
- Duplicate detection & idempotency  
- Late-arrival handling with retroactive updates  
- Missing data interpolation  
- Deterministic replay system  
- Full audit trail  
- Interactive React dashboard  
- 14 automated tests + 5 fixture files

---

## Architecture

**Backend**: FastAPI + NumPy | **Frontend**: React + Vite | **Real-time**: WebSockets

```
React Dashboard (5173)
        ↓ WebSocket / REST
FastAPI Backend (8000)
  ├─ StateEngine (event sourcing)
  ├─ AnomalyDetector (NumPy Z-score)
  ├─ AuditLogger (immutable trail)
  └─ ReplayEngine (deterministic)
```

---

## Data Models

**Transaction Event (Input):**
```json
{
  "id": "txn-001",
  "timestamp": "2026-08-15T10:00:00Z",
  "source": "exchange-A",
  "account_id": "acc-100",
  "amount": 5000.0,
  "type": "buy"
}
```

**Account State:**
```json
{
  "account_id": "acc-100",
  "balance": 45000.0,
  "last_updated": "2026-08-15T10:05:00Z",
  "transaction_count": 6
}
```

**Audit Log Entry:**
```json
{
  "audit_id": "aud-001",
  "event_id": "txn-001",
  "action": "PROCESSED",
  "state_before": { "balance": 50000.0 },
  "state_after": { "balance": 45000.0 },
  "decision": "ACCEPTED",
  "reasoning": "Z-score within threshold"
}
```

---

## Quick Start

### Prerequisites

- **Python 3.9+** with pip
- **Node.js 16+** with npm

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/MyOnsite.git
cd MyOnsite
```

### 2. Set Up Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend available at http://127.0.0.1:8000

### 3. Set Up Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend available at http://localhost:5173

### 4. Verify Installation

1. Open http://localhost:5173 in your browser
2. Use "Replay Controls" to load a fixture file
3. Observe real-time updates

---

## Usage Guide

### Ingest Transactions (REST API)

```bash
# Single transaction
curl -X POST "http://127.0.0.1:8000/api/transactions" \
  -H "Content-Type: application/json" \
  -d '{"id": "txn-001", "timestamp": "2026-08-15T10:00:00Z", "source": "exchange-A", "account_id": "acc-100", "amount": 5000.0, "type": "buy"}'

# Batch from fixture
curl -X POST "http://127.0.0.1:8000/api/transactions/batch" \
  -H "Content-Type: application/json" \
  -d @fixtures/01_normal_flow.json
```

### Query State

```bash
curl http://127.0.0.1:8000/api/state              # All accounts
curl http://127.0.0.1:8000/api/state/acc-100     # Specific account
```

---

## Testing

```bash
cd backend
pytest tests/ -v --tb=short
```

Test coverage includes state reconstruction, anomaly detection, replay determinism, and all 5 fixtures.

Expected result: `14 passed`

---

## Fixtures (Edge Cases)

| Fixture | Purpose |
|---------|---------|
| **01_normal_flow.json** | Sequential valid transactions |
| **02_duplicate_events.json** | Duplicate rejection & idempotency |
| **03_late_arriving.json** | Late events & retroactive updates |
| **04_missing_data.json** | Missing data gaps & interpolation |
| **05_conflicting_threshold.json** | Z-scores at threshold boundary |

---

## Configuration

Environment variables in `backend/app/config.py`:

```python
ANOMALY_Z_SCORE_THRESHOLD = 3.0
ROLLING_WINDOW_MINUTES = 10
MISSING_DATA_THRESHOLD_MINUTES = 5.0
```

Override via environment:
```bash
export ANOMALY_Z_SCORE_THRESHOLD=2.5
cd backend && uvicorn app.main:app --reload
```

---

## How It Works

1. **Deduplication**: Check if event ID exists; reject duplicates.
2. **Sorting**: Insert event into log by timestamp (with source reliability as tiebreaker).
3. **Late-Arrival Handling**: If event inserted before log end, trigger retroactive recomputation.
4. **Anomaly Detection**: Compute Z-score using rolling 10-minute window statistics.
5. **Audit Logging**: Record state before/after, anomaly result, and reasoning.
6. **Deterministic Replay**: Re-process sorted events to reproduce identical state and audit trail.

---

## Project Structure

```
MyOnsite/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── config.py               # Configuration
│   │   ├── models/
│   │   │   ├── transaction.py      # Transaction models
│   │   │   ├── state.py            # State models
│   │   │   └── audit.py            # Audit models
│   │   ├── core/
│   │   │   ├── state_engine.py     # State reconstruction
│   │   │   ├── anomaly_detector.py # Anomaly detection
│   │   │   ├── audit_logger.py     # Audit trail
│   │   │   └── replay_engine.py    # Replay system
│   │   ├── api/
│   │   │   ├── transactions.py
│   │   │   ├── state.py
│   │   │   ├── replay.py
│   │   │   └── websocket.py
│   │   └── utils/
│   │       └── helpers.py
│   ├── fixtures/                   # Test datasets
│   ├── tests/                      # Automated tests
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── TransactionFeed.jsx
│   │   │   ├── AnomalyPanel.jsx
│   │   │   ├── AuditLog.jsx
│   │   │   ├── AccountStateView.jsx
│   │   │   ├── ReplayControls.jsx
│   │   │   └── StatsCharts.jsx
│   │   ├── hooks/
│   │   │   └── useWebSocket.js
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
│   └── package.json
│
├── MyOnsitePRD.md
├── implementation_plan.md
└── README.md
```

Version: 1.0.0
