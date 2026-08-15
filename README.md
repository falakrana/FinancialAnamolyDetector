# Real-Time Financial Anomaly Detection Engine

A high-performance, production-grade anomaly detection system for detecting financial trading irregularities such as spoofing, wash trading, and regulatory violations. Built with **FastAPI**, **NumPy**, and **React**, featuring temporal state replay capabilities and full audit compliance.

![Status](https://img.shields.io/badge/status-complete-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Python](https://img.shields.io/badge/python-3.9%2B-blue) ![Node.js](https://img.shields.io/badge/node.js-16%2B-green)

---

## 🎯 Overview

This system ingests asynchronous, out-of-order financial transaction records from multiple sources and:

- **Reconstructs Consistent State**: Handles late-arriving events, duplicates, and missing data through deterministic temporal processing
- **Detects Anomalies**: Uses NumPy-based statistical models (Z-score analysis on rolling 10-minute windows) to identify suspicious transactions
- **Maintains Audit Trail**: Records every state transition and decision with full context for compliance
- **Supports Deterministic Replay**: Reproduces historical states and decisions identically for verification and testing

### Key Features

✅ **Real-Time Processing** - Live WebSocket streaming of transactions, anomalies, and state updates  
✅ **Duplicate Detection** - Idempotent processing prevents duplicate transactions from affecting state  
✅ **Late-Arrival Handling** - Retroactively corrects balances when out-of-order events arrive  
✅ **Missing Data Recovery** - Interpolates missing transactions from historical patterns  
✅ **Deterministic Replay** - Replay events to reconstruct historical states identically  
✅ **Full Auditability** - Immutable audit trail with decision reasoning and state snapshots  
✅ **Interactive Dashboard** - Real-time visualization of transactions, anomalies, and account states  
✅ **Edge Case Validation** - 5 comprehensive fixture files + 14 automated tests  

---

## 🏗️ Architecture

### Backend Stack
- **Framework**: FastAPI 0.100+
- **Processing**: NumPy 1.24+ (statistical anomaly detection)
- **Data Validation**: Pydantic 2.0+
- **Real-Time**: WebSockets 11.0+
- **Testing**: pytest 7.4+

### Frontend Stack
- **Framework**: React 19+
- **Bundler**: Vite 8.2+
- **HTTP Client**: Axios 1.19+
- **Charts**: Recharts 3.10+ (rolling stats visualization)
- **Icons**: Lucide React 1.31+

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Dashboard (Frontend)                   │
│  Transaction Feed │ Account Balances │ Anomaly Panel │ Charts   │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                    WebSocket (Real-time) │ REST API
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                    FastAPI Backend (Port 8000)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              API Router Layer                            │  │
│  │  /transactions │ /state │ /anomalies │ /audit │ /replay  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Core Processing Engines (Singletons)           │  │
│  │                                                          │  │
│  │  ┌──────────────────┐  ┌──────────────────┐             │  │
│  │  │ StateEngine      │  │ AnomalyDetector  │             │  │
│  │  │                  │  │                  │             │  │
│  │  │ • Event sorting  │  │ • Z-score        │             │  │
│  │  │ • Deduplication │  │ • Rolling window │             │  │
│  │  │ • Late arrival   │  │ • Threshold check│             │  │
│  │  │ • Balance update │  │ • Edge cases     │             │  │
│  │  └──────────────────┘  └──────────────────┘             │  │
│  │                                                          │  │
│  │  ┌──────────────────┐  ┌──────────────────┐             │  │
│  │  │ AuditLogger      │  │ ReplayEngine     │             │  │
│  │  │                  │  │                  │             │  │
│  │  │ • Immutable      │  │ • Deterministic  │             │  │
│  │  │ • Decision trail │  │ • Reproducible   │             │  │
│  │  │ • JSON export    │  │ • Verification   │             │  │
│  │  └──────────────────┘  └──────────────────┘             │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Data Models

### Transaction Event (Input)

```json
{
  "id": "txn-abc-001",
  "timestamp": "2026-08-15T10:30:00.123Z",
  "source": "exchange-A",
  "account_id": "acc-1234",
  "amount": 15000.50,
  "type": "buy",
  "metadata": {
    "instrument": "AAPL",
    "exchange": "NYSE"
  }
}
```

**Fields:**
- `id` (string): Unique transaction identifier for deduplication
- `timestamp` (ISO 8601): Event timestamp (processed chronologically, not reception time)
- `source` (string): Originating system (used for conflict resolution)
- `account_id` (string): Target account identifier
- `amount` (float): Transaction amount in base currency
- `type` (enum): Transaction type — `buy`, `sell`, `deposit`, `withdrawal`
- `metadata` (object, optional): Additional context (instrument, exchange, etc.)

### Account State (Internal)

```json
{
  "account_id": "acc-1234",
  "balance": 250000.00,
  "last_updated": "2026-08-15T10:30:00.123Z",
  "transaction_count": 47
}
```

### Audit Log Entry (Output)

```json
{
  "audit_id": "aud-001",
  "event_id": "txn-abc-001",
  "timestamp": "2026-08-15T10:30:00.123Z",
  "action": "PROCESSED",
  "state_before": { "balance": 235000.00 },
  "state_after": { "balance": 250000.50 },
  "anomaly_result": {
    "is_anomaly": true,
    "z_score": 3.42,
    "threshold": 3.0,
    "rolling_mean": 5000.00,
    "rolling_std": 2923.00,
    "reasoning": "Z-score 3.42 exceeds threshold 3.0 on 10-min window"
  },
  "decision": "FLAGGED",
  "reasoning": "Transaction amount deviates significantly from rolling pattern"
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

### Ingesting Transactions

#### Single Transaction (REST API)

```bash
curl -X POST "http://127.0.0.1:8000/api/transactions" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "txn-001",
    "timestamp": "2026-08-15T10:00:00Z",
    "source": "exchange-A",
    "account_id": "acc-100",
    "amount": 5000.0,
    "type": "buy"
  }'
```

#### Batch Transactions

```bash
curl -X POST "http://127.0.0.1:8000/api/transactions/batch" \
  -H "Content-Type: application/json" \
  -d @fixtures/01_normal_flow.json
```

### Querying State

```bash
# Get all account states
curl http://127.0.0.1:8000/api/state

# Get specific account state
curl http://127.0.0.1:8000/api/state/acc-100
```

### Retrieving Anomalies

```bash
# Get all flagged anomalies
curl http://127.0.0.1:8000/api/anomalies

# Get anomalies for specific account
curl http://127.0.0.1:8000/api/anomalies/acc-100
```

### Audit Trail

```bash
# Get full audit trail
curl http://127.0.0.1:8000/api/audit

# Get audit trail for account
curl http://127.0.0.1:8000/api/audit/acc-100

# Export to JSON file
curl http://127.0.0.1:8000/api/audit/export -o audit_trail.json
```

### Replay Events

```bash
# Replay events from a fixture file
curl -X POST "http://127.0.0.1:8000/api/replay/fixture/01_normal_flow"

# Upload and replay custom transactions
curl -X POST "http://127.0.0.1:8000/api/replay" \
  -H "Content-Type: application/json" \
  -d @custom_transactions.json
```

---

## 🧪 Testing

### Run All Tests

```bash
cd backend
pytest tests/ -v --tb=short
```

### Run Specific Test Suite

```bash
# State engine tests
pytest tests/test_state_engine.py -v

# Anomaly detection tests
pytest tests/test_anomaly_detector.py -v

# Edge case tests (all fixtures)
pytest tests/test_edge_cases.py -v

# Replay determinism tests
pytest tests/test_replay_engine.py -v
```

### Test Coverage

14 automated tests covering:

- ✅ State reconstruction with duplicate rejection
- ✅ Transaction sorting and late-arrival processing
- ✅ Retroactive balance recomputation
- ✅ Z-score anomaly detection
- ✅ Rolling window statistics
- ✅ Threshold boundary handling
- ✅ Standard deviation edge cases (zero std)
- ✅ Deterministic replay verification
- ✅ All 5 fixture scenarios
- ✅ Idempotency guarantees
- ✅ Missing data interpolation
- ✅ Conflicting event resolution
- ✅ Audit trail immutability
- ✅ JSON export correctness

**Expected Result:**
```
=============================== 14 passed in 2.34s ================================
```

---

## 📁 Fixture Files (Edge Case Coverage)

| Fixture | Purpose | Edge Cases |
|---------|---------|-----------|
| **01_normal_flow.json** | Happy path baseline | Sequential valid transactions, consistent timestamps |
| **02_duplicate_events.json** | Idempotency validation | Same `id` sent multiple times, out-of-order duplicates |
| **03_late_arriving.json** | Late-arrival handling | Events with older timestamps than current state, retroactive updates |
| **04_missing_data.json** | Missing data recovery | Gaps in transaction sequences, interpolation from rolling mean |
| **05_conflicting_threshold.json** | Boundary conditions | Z-scores exactly at threshold, conflicting sources, edge detection |

All fixtures are located in `backend/fixtures/` and can be replayed via the dashboard or API.

---

## ⚙️ Configuration

Configuration is controlled via environment variables in `backend/app/config.py`:

```python
# Anomaly Detection Settings
ANOMALY_Z_SCORE_THRESHOLD = 3.0          # Z-score threshold for flagging anomalies
ROLLING_WINDOW_MINUTES = 10               # Rolling window for statistical computation
MISSING_DATA_THRESHOLD_MINUTES = 5.0      # Gap threshold for missing data detection

# Source Reliability Ranking (for conflict resolution)
SOURCE_RELIABILITY_RANKING = {
    "exchange-A": 3,      # Most reliable
    "exchange-B": 2,
    "internal-log": 1     # Least reliable
}
```

### Override via Environment Variables

```bash
# Set Z-score threshold to 2.5
export ANOMALY_Z_SCORE_THRESHOLD=2.5

# Set rolling window to 15 minutes
export ROLLING_WINDOW_MINUTES=15

# Run backend with overrides
cd backend && uvicorn app.main:app --reload
```

---

## 🔍 How It Works

### 1. Event Ingestion & Deduplication

```
Incoming Event
       │
       ├─→ Check: Has this ID been processed before?
       │   ├─ YES → Reject as duplicate (audit logged)
       │   └─ NO → Continue
       │
       └─→ Insert into sorted event log (by timestamp, then source reliability)
```

### 2. State Reconstruction

Events are stored in a **sorted event log** by timestamp. When a transaction arrives:

```
1. Sort by: (timestamp ASC, source_reliability DESC, event_id ASC)
2. If late-arriving (inserted before the end):
   - Mark as retroactive
   - Trigger full recomputation from insertion point forward
3. Update all downstream account balances
```

### 3. Anomaly Detection (NumPy Z-Score)

For each transaction:

```
1. Build rolling window: all transactions in the same account 
   from (event.timestamp - 10 minutes) to event.timestamp

2. Compute rolling statistics:
   - mean = np.mean(window_amounts)
   - std = np.std(window_amounts)

3. Calculate Z-score:
   - z_score = |transaction.amount - mean| / std
   - Handle edge case: if std == 0, any deviation is anomalous

4. Decision:
   - If z_score >= threshold (default 3.0) → FLAGGED as anomaly
   - Else → ACCEPTED
```

### 4. Audit Logging

Every decision is immutably logged with:
- Event ID and timestamp
- Action taken (PROCESSED, REJECTED_DUPLICATE, RETROACTIVE_UPDATE, etc.)
- State before and after
- Anomaly result (z_score, threshold, reasoning)
- Full reasoning for the decision

### 5. Deterministic Replay

Replay engine recreates identical state by:
```
1. Sort events chronologically
2. Create fresh StateEngine, AnomalyDetector, AuditLogger
3. Process each event sequentially in sorted order
4. Compare final state and audit trail with expected output
```

Since all operations are deterministic (no randomness, consistent sorting), replaying the same events always produces identical results.

---

## 📈 Performance Characteristics

### Processing Latency
- **Single transaction**: ~1-2ms (for normal cases)
- **Batch of 100**: ~50-100ms
- **Late-arrival recomputation** (worst case): O(n) where n = events for account since insertion point

### Memory Usage
- **Event log**: O(n) where n = total transactions
- **Account states**: O(m) where m = unique accounts
- **Audit trail**: O(n) one entry per transaction processed

### Scalability Considerations
- Current implementation uses in-memory data structures (suitable for < 1M transactions)
- For production at scale, consider:
  - Event sourcing database (EventStoreDB, Kafka)
  - Distributed replay (Apache Flink, Spark)
  - Materialized view cache (Redis, DynamoDB)

---

## 🛡️ Design Guarantees

### Determinism
**Identical input + configuration → Identical output**

- No randomness in core logic
- Event ordering strictly by timestamp, then source reliability
- All NumPy operations are deterministic
- No wall-clock timestamps in processing logic

### Replayability
**Replay same events → Reproduce identical state and audit**

- Full event log is preserved
- Deterministic ordering ensures reproducibility
- Audit trail captures all decisions for verification

### Auditability
**Full context for every decision**

- State snapshots before/after
- Z-score, threshold, and reasoning
- Action type (processed, rejected, retroactive, etc.)
- Immutable audit trail (append-only)

### Idempotency
**Same event never alters state more than once**

- Deduplication by `id` prevents re-processing
- Rejected duplicates are logged but don't change balances
- Monotonic transaction counter prevents double-counting

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error:** `Address already in use`
```bash
# Kill existing process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use a different port
uvicorn app.main:app --port 8001
```

### WebSocket Connection Failed

**Error:** `Stream disconnected` on Windows
- Ensure backend is running with `--host 0.0.0.0`
- Frontend uses `127.0.0.1` instead of `localhost` for IPv6 compatibility
- Check browser console for connection errors

### Fixture Files Not Found

**Error:** `FileNotFoundError` when replaying fixtures
```bash
# Ensure you're in the correct directory
cd backend
# Verify fixtures exist
ls fixtures/

# Replay with correct path
curl http://127.0.0.1:8000/api/replay/fixture/01_normal_flow
```

### Tests Failing

```bash
# Run with verbose output
pytest tests/ -v --tb=long

# Run single test for debugging
pytest tests/test_state_engine.py::test_duplicate_rejection -v

# Show print statements
pytest tests/ -v -s
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

### Adding New Fixtures

1. Create a new JSON file in `backend/fixtures/`
2. Follow the transaction event schema
3. Add corresponding test in `backend/tests/test_edge_cases.py`
4. Document the edge cases covered in the fixture

### Extending Anomaly Detection

1. Edit `backend/app/core/anomaly_detector.py`
2. Add new detection methods (ML models can go in bonus scope)
3. Update tests with new test cases
4. Verify determinism (replay produces identical results)

### Enhancing Dashboard

1. Create new component in `frontend/src/components/`
2. Connect to backend API or WebSocket as needed
3. Ensure responsive design and accessibility
4. Test with real-time data streaming

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

## 📝 License

This project is licensed under the MIT License. See LICENSE file for details.

---

## 👤 Authors

- **Your Name** - Initial implementation and architecture

---

## 🙏 Acknowledgments

- **FastAPI** for the elegant web framework
- **NumPy** for high-performance numerical computing
- **React & Vite** for the modern frontend tooling
- **Pydantic** for robust data validation

---

## 📞 Support

For issues, questions, or contributions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review existing [GitHub Issues](https://github.com/yourusername/MyOnsite/issues)
3. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs. actual behavior
   - Relevant logs or screenshots

---

## 🗺️ Roadmap

### Phase 1: MVP (Complete ✅)
- ✅ State reconstruction engine
- ✅ NumPy anomaly detection
- ✅ Audit & replay system
- ✅ React dashboard
- ✅ 14 automated tests
- ✅ 5 fixture files

### Phase 2: Advanced Features (Future)
- [ ] Machine learning-based anomaly detection (scikit-learn)
- [ ] Human-in-the-loop review system
- [ ] Multi-tenant support
- [ ] Database persistence (PostgreSQL)
- [ ] Distributed replay (Apache Spark)
- [ ] Real-time alerts (Slack, email)

### Phase 3: Production Hardening
- [ ] Rate limiting & throttling
- [ ] Authentication & authorization
- [ ] Comprehensive logging
- [ ] Performance monitoring
- [ ] Load testing & benchmarks

---

**Last Updated:** August 15, 2026  
**Version:** 1.0.0
