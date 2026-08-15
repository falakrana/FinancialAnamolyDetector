# Real-Time Financial Anomaly Detection Engine

A high-performance anomaly detection system for detecting financial trading irregularities. Built with **FastAPI**, **NumPy**, and **React**, featuring temporal state replay and full audit compliance.

---

## 🎯 Overview

Ingests asynchronous, out-of-order transaction records and:

- **Reconstructs Consistent State**: Handles late-arriving events, duplicates, and missing data
- **Detects Anomalies**: NumPy-based Z-score analysis on 10-minute rolling windows
- **Maintains Audit Trail**: Records every state transition and decision
- **Deterministic Replay**: Reproduces historical states identically for verification

### Key Features

✅ Real-time WebSocket streaming  
✅ Duplicate detection & idempotency  
✅ Late-arrival handling with retroactive updates  
✅ Missing data interpolation  
✅ Deterministic replay system  
✅ Full audit trail  
✅ Interactive React dashboard  
✅ 14 automated tests + 5 fixture files  

---

## 🏗️ Architecture

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

## 📋 Data Models

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

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+** with pip
- **Node.js 16+** with npm
- **Git** for version control

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/MyOnsite.git
cd MyOnsite
```

### 2. Set Up Backend

```powershell
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:** http://127.0.0.1:8000
- **API Docs**: http://127.0.0.1:8000/docs (Swagger UI)
- **ReDoc**: http://127.0.0.1:8000/redoc
- **WebSocket**: ws://127.0.0.1:8000/ws/live

### 3. Set Up Frontend

In a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

**Frontend will be available at:** http://localhost:5173

### 4. Verify Installation

1. Open http://localhost:5173 in your browser
2. Dashboard should load with empty state
3. Use "Replay Controls" to load a fixture file
4. Observe real-time updates and anomalies

---

## 📊 Usage Guide

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

### Query State & Anomalies

```bash
curl http://127.0.0.1:8000/api/state              # All accounts
curl http://127.0.0.1:8000/api/state/acc-100     # Specific account
curl http://127.0.0.1:8000/api/anomalies         # All anomalies
curl http://127.0.0.1:8000/api/audit             # Audit trail
```

### Replay Events

```bash
curl -X POST "http://127.0.0.1:8000/api/replay/fixture/01_normal_flow"
```

---

## 🧪 Testing

```bash
cd backend
pytest tests/ -v --tb=short
```

**Test Coverage:**
- State reconstruction with duplicates ✅
- Late-arrival processing ✅
- Z-score anomaly detection ✅
- Rolling window edge cases ✅
- Deterministic replay ✅
- All 5 fixtures ✅

**Expected Result:** `14 passed`

---

## 📁 Fixtures (Edge Cases)

| Fixture | Purpose |
|---------|---------|
| **01_normal_flow.json** | Sequential valid transactions |
| **02_duplicate_events.json** | Duplicate rejection & idempotency |
| **03_late_arriving.json** | Late events & retroactive updates |
| **04_missing_data.json** | Missing data gaps & interpolation |
| **05_conflicting_threshold.json** | Z-scores at threshold boundary |

---

## ⚙️ Configuration

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

## 🔍 How It Works

**1. Deduplication:** Check if event ID exists; reject duplicates.

**2. Sorting:** Insert event into log by timestamp (with source reliability as tiebreaker).

**3. Late-Arrival Handling:** If event inserted before log end, trigger retroactive recomputation.

**4. Anomaly Detection:** Compute Z-score using rolling 10-minute window statistics.

**5. Audit Logging:** Record state before/after, anomaly result, and reasoning.

**6. Deterministic Replay:** Re-process sorted events to reproduce identical state and audit trail.

---

## 📈 Performance

- **Single transaction:** ~1-2ms
- **Batch of 100:** ~50-100ms
- **Late-arrival recomputation:** O(n) where n = events since insertion
- **Memory:** O(n) for events + O(m) for accounts

---

## 🛡️ Design Guarantees

- **Determinism:** Identical input → identical output (no randomness)
- **Replayability:** Replay events → reproduce identical state & audit
- **Auditability:** Full context for every decision
- **Idempotency:** Same event never alters state more than once

---

## 🐛 Troubleshooting

**Backend Won't Start:** Port 8000 already in use
```bash
uvicorn app.main:app --port 8001
```

**WebSocket Connection Failed:** Ensure backend running with `--host 0.0.0.0`

**Fixture Files Not Found:** Verify path and check `backend/fixtures/` directory

**Tests Failing:**
```bash
pytest tests/ -v --tb=long
```

---

## 📚 Project Structure

```
MyOnsite/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── config.py               # Configuration & thresholds
│   │   ├── models/
│   │   │   ├── transaction.py      # Transaction Pydantic models
│   │   │   ├── state.py            # Account state models
│   │   │   └── audit.py            # Audit log models
│   │   ├── core/
│   │   │   ├── state_engine.py     # Event sourcing & state reconstruction
│   │   │   ├── anomaly_detector.py # NumPy Z-score analysis
│   │   │   ├── audit_logger.py     # Immutable audit trail
│   │   │   └── replay_engine.py    # Deterministic replay
│   │   ├── api/
│   │   │   ├── transactions.py     # Transaction ingestion
│   │   │   ├── state.py            # State queries
│   │   │   ├── anomalies.py        # Anomaly queries
│   │   │   ├── audit.py            # Audit trail endpoints
│   │   │   ├── replay.py           # Replay controls
│   │   │   └── websocket.py        # WebSocket streaming
│   │   └── utils/
│   │       └── helpers.py          # Utilities
│   ├── fixtures/                   # 5 edge-case test datasets
│   │   ├── 01_normal_flow.json
│   │   ├── 02_duplicate_events.json
│   │   ├── 03_late_arriving.json
│   │   ├── 04_missing_data.json
│   │   └── 05_conflicting_threshold.json
│   ├── tests/                      # 14 automated tests
│   │   ├── test_state_engine.py
│   │   ├── test_anomaly_detector.py
│   │   ├── test_audit_logger.py
│   │   ├── test_replay_engine.py
│   │   └── test_edge_cases.py
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── public/                     # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx       # Main layout
│   │   │   ├── TransactionFeed.jsx # Live transaction stream
│   │   │   ├── AnomalyPanel.jsx    # Anomaly alerts
│   │   │   ├── AuditLog.jsx        # Audit trail viewer
│   │   │   ├── AccountStateView.jsx# Account balances
│   │   │   ├── ReplayControls.jsx  # Replay interface
│   │   │   └── StatsCharts.jsx     # Charts visualization
│   │   ├── hooks/
│   │   │   └── useWebSocket.js     # WebSocket connection
│   │   ├── services/
│   │   │   └── api.js              # REST client
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── MyOnsitePRD.md                  # Product requirements
├── implementation_plan.md          # Implementation details
├── walkthrough.md                  # Feature walkthrough
└── README.md                       # This file
```

---

## 🤝 Contributing

**Adding Fixtures:** Create JSON file in `backend/fixtures/` following transaction schema.

**Extending Detection:** Edit `backend/app/core/anomaly_detector.py` and verify determinism via replay.

**Dashboard Enhancements:** Add components in `frontend/src/components/` connected to API/WebSocket.

---

## 📖 API Reference

### Transactions

#### POST `/api/transactions`
Ingest a single transaction event.

**Request:**
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

**Response (200):**
```json
{
  "status": "PROCESSED",
  "was_late": false,
  "event": { ... },
  "audit_entry": { ... }
}
```

#### POST `/api/transactions/batch`
Ingest multiple transactions (supports bulk operations).

---

### State

#### GET `/api/state`
Get current global state of all accounts.

**Response (200):**
```json
{
  "acc-100": {
    "account_id": "acc-100",
    "balance": 45000.0,
    "last_updated": "2026-08-15T10:05:00Z",
    "transaction_count": 6
  }
}
```

#### GET `/api/state/{account_id}`
Get state for a specific account.

---

### Anomalies

#### GET `/api/anomalies`
Get all flagged anomalies.

#### GET `/api/anomalies/{account_id}`
Get anomalies for a specific account.

---

### Audit

#### GET `/api/audit`
Get full audit trail.

#### GET `/api/audit/{account_id}`
Get audit trail for a specific account.

#### GET `/api/audit/export`
Export audit trail as JSON file.

---

### Replay

#### POST `/api/replay`
Replay a custom set of transactions.

#### POST `/api/replay/fixture/{name}`
Replay a fixture file (e.g., `01_normal_flow`).

---

### WebSocket

#### WS `/ws/live`
Subscribe to real-time updates.

**Message Types:**
```json
{
  "type": "TRANSACTION_PROCESSED",
  "data": { ... }
}

{
  "type": "ANOMALY_DETECTED",
  "data": { ... }
}

{
  "type": "STATE_UPDATED",
  "data": { ... }
}
```

---

**Last Updated:** August 15, 2026 | **Version:** 1.0.0
