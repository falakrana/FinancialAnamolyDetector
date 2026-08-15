# Real-Time Financial Anomaly Detection Engine — Implementation Plan

## Overview

A real-time anomaly detection system built with **FastAPI** (backend) and **React** (frontend) that ingests out-of-order financial transactions, maintains consistent global state, detects anomalies via NumPy statistical models, and provides a fully auditable, deterministic replay system.

---

## Project Structure

```
MyOnsite/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entry point, CORS, lifespan
│   │   ├── config.py                  # App configuration & thresholds
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── transaction.py         # Transaction Pydantic models
│   │   │   ├── state.py               # Account state models
│   │   │   └── audit.py               # Audit log entry models
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── state_engine.py        # State reconstruction engine
│   │   │   ├── anomaly_detector.py    # NumPy-based anomaly detection
│   │   │   ├── audit_logger.py        # Immutable audit trail manager
│   │   │   └── replay_engine.py       # Deterministic replay system
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── transactions.py        # Transaction ingestion endpoints
│   │   │   ├── state.py               # State query endpoints
│   │   │   ├── anomalies.py           # Anomaly query endpoints
│   │   │   ├── audit.py               # Audit log endpoints
│   │   │   ├── replay.py              # Replay control endpoints
│   │   │   └── websocket.py           # WebSocket for real-time push
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── helpers.py             # Timestamp parsing, ID generation
│   ├── fixtures/                      # ≥5 sample datasets for edge cases
│   │   ├── 01_normal_flow.json
│   │   ├── 02_duplicate_events.json
│   │   ├── 03_late_arriving.json
│   │   ├── 04_missing_data.json
│   │   └── 05_conflicting_threshold.json
│   ├── output/                        # Audit/decision-trace JSON output
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_state_engine.py
│   │   ├── test_anomaly_detector.py
│   │   ├── test_audit_logger.py
│   │   ├── test_replay_engine.py
│   │   └── test_edge_cases.py
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx          # Main dashboard layout
│   │   │   ├── TransactionFeed.jsx    # Live transaction stream
│   │   │   ├── AnomalyPanel.jsx       # Anomaly alerts & details
│   │   │   ├── AuditLog.jsx           # Audit trail viewer
│   │   │   ├── AccountStateView.jsx   # Global account balances
│   │   │   ├── ReplayControls.jsx     # Replay UI controls
│   │   │   └── StatsCharts.jsx        # Rolling stats visualization
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js        # WebSocket connection hook
│   │   │   └── useApi.js              # REST API hook
│   │   ├── services/
│   │   │   └── api.js                 # Axios/fetch API client
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.js
│   ├── package.json
│   └── README.md
│
├── MyOnsitePRD.md                     # Original PRD
└── README.md                          # Root documentation
```

---

## Data Models

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

### Account State (Internal)

```json
{
  "account_id": "acc-1234",
  "balance": 250000.00,
  "last_updated": "2026-08-15T10:30:00.123Z",
  "transaction_count": 47,
  "rolling_window": []  // last 10-min of amounts for stats
}
```

### Audit Log Entry (Output)

```json
{
  "audit_id": "aud-001",
  "event_id": "txn-abc-001",
  "timestamp": "2026-08-15T10:30:00.123Z",
  "action": "PROCESSED | DUPLICATE_REJECTED | ANOMALY_FLAGGED",
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

## Backend Implementation — Module Breakdown

### Phase 1: Core Data Models & Config

**File: `app/config.py`**

- Anomaly detection thresholds (Z-score threshold = 3.0, configurable)
- Rolling window size (10 minutes)
- Source reliability ranking (for conflict resolution)
- Duplicate detection window

**File: `app/models/transaction.py`**

- `TransactionEvent` — Pydantic model for incoming events
- `TransactionType` — Enum: `buy`, `sell`, `deposit`, `withdrawal`
- Input validation: required fields, timestamp format, positive amounts

**File: `app/models/state.py`**

- `AccountState` — current balance, transaction history window, counters
- `GlobalState` — dict of `account_id → AccountState`

**File: `app/models/audit.py`**

- `AuditEntry` — immutable record of each decision
- `AnomalyResult` — detection details (z_score, threshold, reasoning)

---

### Phase 2: State Reconstruction Engine

**File: `app/core/state_engine.py`**

This is the heart of the system — an **event-sourcing** engine.

```
Class: StateEngine
├── _global_state: Dict[str, AccountState]
├── _event_log: List[TransactionEvent]       # ordered by timestamp
├── _seen_ids: Set[str]                      # for dedup
│
├── process_event(event) → ProcessingResult
│   ├── 1. Deduplication check (reject if id in _seen_ids)
│   ├── 2. Insert into _event_log in timestamp order
│   ├── 3. If late-arriving → trigger retroactive recomputation
│   ├── 4. Update account balance
│   ├── 5. Update rolling window (10-min)
│   └── 6. Return state_before, state_after, was_late
│
├── _recompute_from(timestamp) → void
│   └── Replay all events from given timestamp forward
│       (handles late-arriving events retroactively)
│
├── get_state(account_id) → AccountState
├── get_global_state() → Dict[str, AccountState]
├── get_event_log() → List[TransactionEvent]
└── reset() → void
```

**Key Design Decisions:**

- Events stored in a **sorted list** (by timestamp) using `bisect.insort`
- Deduplication via `id` — O(1) lookup with a `set`
- Late events trigger recomputation from the late event's timestamp forward
- Missing data: if a gap in expected sequence is detected, log it and interpolate from rolling mean

---

### Phase 3: Anomaly Detection Module

**File: `app/core/anomaly_detector.py`**

```
Class: AnomalyDetector
├── config: AnomalyConfig (threshold, window_size)
│
├── analyze(event, account_state) → AnomalyResult
│   ├── 1. Get rolling window of amounts (last 10 min)
│   ├── 2. Compute rolling_mean = np.mean(window)
│   ├── 3. Compute rolling_std = np.std(window)
│   ├── 4. z_score = (amount - rolling_mean) / rolling_std
│   │       (handle std=0 case → no anomaly if amount == mean, else flag)
│   ├── 5. Compare: z_score > threshold → ANOMALY
│   │       Edge case: z_score == threshold → ANOMALY (>=)
│   └── 6. Return AnomalyResult with full reasoning
│
├── compute_z_score(value, window) → float
├── compute_rolling_stats(window) → (mean, std)
└── update_config(new_config) → void
```

**NumPy Usage:**

- `np.mean()`, `np.std()` for rolling statistics
- `np.array()` for windowed data
- `np.abs()` for absolute deviation scores
- All computations are deterministic (no random state)

**Edge Cases:**

- Window has < 2 data points → skip anomaly detection, return `NOT_ENOUGH_DATA`
- `std == 0` → all values identical; if new value differs, flag as anomaly
- `z_score == threshold` → treat as anomaly (use `>=`)

---

### Phase 4: Audit & Replay System

**File: `app/core/audit_logger.py`**

```
Class: AuditLogger
├── _audit_trail: List[AuditEntry]     # immutable, append-only
│
├── log(event, state_before, state_after, anomaly_result, decision) → AuditEntry
│   └── Creates immutable AuditEntry, appends to trail
│
├── get_trail() → List[AuditEntry]
├── get_trail_for_account(account_id) → List[AuditEntry]
├── export_json(filepath) → void        # write to output/
└── get_trail_between(start, end) → List[AuditEntry]
```

**File: `app/core/replay_engine.py`**

```
Class: ReplayEngine
├── replay(events: List[TransactionEvent]) → ReplayResult
│   ├── 1. Sort events by timestamp
│   ├── 2. Create fresh StateEngine + AnomalyDetector + AuditLogger
│   ├── 3. Process each event sequentially
│   ├── 4. Return final state + audit trail
│   └── 5. Guarantee: same input → same output (deterministic)
│
├── replay_and_compare(events, expected_state, expected_audit) → ComparisonResult
│   └── Replay and diff against expected outputs
│
└── replay_from_fixture(fixture_path) → ReplayResult
```

**Determinism Guarantee:**

- No randomness, no wall-clock timestamps in logic
- Event ordering is strictly by `timestamp` field, ties broken by `source` reliability then `id`
- All NumPy operations are deterministic

---

### Phase 5: FastAPI Endpoints

**File: `app/api/transactions.py`**

| Method   | Endpoint                    | Description                       |
| -------- | --------------------------- | --------------------------------- |
| `POST` | `/api/transactions`       | Ingest a single transaction event |
| `POST` | `/api/transactions/batch` | Ingest a batch of events          |
| `GET`  | `/api/transactions`       | Get all processed transactions    |

**File: `app/api/state.py`**

| Method  | Endpoint                    | Description                     |
| ------- | --------------------------- | ------------------------------- |
| `GET` | `/api/state`              | Get global state (all accounts) |
| `GET` | `/api/state/{account_id}` | Get state for specific account  |

**File: `app/api/anomalies.py`**

| Method  | Endpoint                        | Description                  |
| ------- | ------------------------------- | ---------------------------- |
| `GET` | `/api/anomalies`              | Get all flagged anomalies    |
| `GET` | `/api/anomalies/{account_id}` | Get anomalies for an account |

**File: `app/api/audit.py`**

| Method  | Endpoint                    | Description                     |
| ------- | --------------------------- | ------------------------------- |
| `GET` | `/api/audit`              | Get full audit trail            |
| `GET` | `/api/audit/{account_id}` | Get audit trail for account     |
| `GET` | `/api/audit/export`       | Export audit trail as JSON file |

**File: `app/api/replay.py`**

| Method   | Endpoint                       | Description                           |
| -------- | ------------------------------ | ------------------------------------- |
| `POST` | `/api/replay`                | Replay a set of events, return result |
| `POST` | `/api/replay/fixture/{name}` | Replay a fixture file                 |
| `POST` | `/api/replay/compare`        | Replay & compare with expected output |

**File: `app/api/websocket.py`**

| Type   | Endpoint     | Description                                              |
| ------ | ------------ | -------------------------------------------------------- |
| `WS` | `/ws/live` | Real-time push of transactions, anomalies, state changes |

---

### Phase 6: WebSocket Real-Time Push

```
Client connects → /ws/live
Server pushes on each event:
{
  "type": "TRANSACTION_PROCESSED | ANOMALY_DETECTED | STATE_UPDATED",
  "data": { ... },
  "timestamp": "..."
}
```

- Use FastAPI's built-in WebSocket support
- Broadcast to all connected clients via a `ConnectionManager` class
- Frontend subscribes on mount, updates UI in real-time

---

## Frontend Implementation — Component Breakdown

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Header: "Financial Anomaly Detection Engine"           │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│   Account Balances   │     Anomaly Alerts Panel         │
│   (cards/table)      │     (real-time flagged txns)     │
│                      │                                  │
├──────────────────────┴──────────────────────────────────┤
│                                                         │
│   Transaction Feed (live stream, color-coded)           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Audit Log (searchable, filterable table)              │
│                                                         │
├─────────────────────────────────────────────────────────┤
│   Replay Controls   │   Stats/Charts (rolling window)  │
└─────────────────────┴───────────────────────────────────┘
```

### Components

| Component                | Purpose                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `Dashboard.jsx`        | Main layout, holds all panels, manages WebSocket connection        |
| `TransactionFeed.jsx`  | Scrollable live feed of incoming transactions, color-coded by type |
| `AnomalyPanel.jsx`     | Real-time anomaly alerts with severity badges, z-score display     |
| `AuditLog.jsx`         | Paginated, filterable audit trail table with expandable rows       |
| `AccountStateView.jsx` | Card grid showing each account's balance, txn count, status        |
| `ReplayControls.jsx`   | Upload fixture, trigger replay, show replay results & diff         |
| `StatsCharts.jsx`      | Line charts for rolling mean/std, scatter plot of z-scores         |

### Hooks

| Hook                | Purpose                                                             |
| ------------------- | ------------------------------------------------------------------- |
| `useWebSocket.js` | Connect to`/ws/live`, auto-reconnect, parse incoming messages     |
| `useApi.js`       | Wrapper around fetch/axios for REST calls with loading/error states |

---

## Fixture Files (≥5 Required)

| # | Fixture                           | Edge Cases Covered                                                                     |
| - | --------------------------------- | -------------------------------------------------------------------------------------- |
| 1 | `01_normal_flow.json`           | Happy path — sequential, valid transactions                                           |
| 2 | `02_duplicate_events.json`      | Same`id` sent multiple times, idempotency check                                      |
| 3 | `03_late_arriving.json`         | Events with timestamps older than current state, retroactive recomputation             |
| 4 | `04_missing_data.json`          | Gaps in expected sequences, interpolation from patterns                                |
| 5 | `05_conflicting_threshold.json` | Conflicting timestamps from different sources + z-scores exactly at threshold boundary |

---

## Testing Strategy

### Unit Tests

- **`test_state_engine.py`**: Process events, verify balances, test dedup, test late arrivals, test recomputation
- **`test_anomaly_detector.py`**: Z-score calculation, edge cases (std=0, small window, threshold boundary)
- **`test_audit_logger.py`**: Immutability, completeness of entries, export
- **`test_replay_engine.py`**: Determinism — replay same events twice → identical output
- **`test_edge_cases.py`**: All 5 fixture files processed, verified against expected output

### Integration Tests

- End-to-end: POST transactions → GET state → verify anomalies → export audit → replay → compare

### Run Command

```bash
cd backend
pytest tests/ -v --tb=short
```

---

## Implementation Order (Recommended for Hackathon)

| Step | Task                                                                       | Priority | Est. Time |
| ---- | -------------------------------------------------------------------------- | -------- | --------- |
| 1    | Set up project structure +`requirements.txt` + Vite React app            | 🟢 High  | 15 min    |
| 2    | Implement Pydantic models (`transaction.py`, `state.py`, `audit.py`) | 🟢 High  | 20 min    |
| 3    | Build`StateEngine` with dedup + late-arrival handling                    | 🟢 High  | 45 min    |
| 4    | Build`AnomalyDetector` with NumPy Z-score + rolling window               | 🟢 High  | 30 min    |
| 5    | Build`AuditLogger` (append-only, export to JSON)                         | 🟢 High  | 20 min    |
| 6    | Build`ReplayEngine` with deterministic replay                            | 🟢 High  | 30 min    |
| 7    | Wire up FastAPI endpoints (transactions, state, anomalies, audit, replay)  | 🟢 High  | 30 min    |
| 8    | Add WebSocket broadcast on event processing                                | 🟡 Med   | 20 min    |
| 9    | Create ≥5 fixture files with edge cases                                   | 🟢 High  | 30 min    |
| 10   | Write automated tests (unit + integration)                                 | 🟢 High  | 45 min    |
| 11   | Build React dashboard with live feed + anomaly panel                       | 🟡 Med   | 60 min    |
| 12   | Add audit log viewer + replay controls to frontend                         | 🟡 Med   | 45 min    |
| 13   | Add charts/visualizations (rolling stats, z-scores)                        | 🟡 Med   | 30 min    |
| 14   | Polish UI (dark theme, animations, responsive)                             | 🔴 Low   | 30 min    |
| 15   | Write README + documentation                                               | 🟢 High  | 20 min    |

**Total estimated: ~7.5 hours**

---

## Tech Dependencies

### Backend (`requirements.txt`)

```
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
pydantic>=2.0.0
numpy>=1.24.0
websockets>=11.0
pytest>=7.4.0
httpx>=0.24.0        # for test client
```

### Frontend (`package.json` key deps)

```
react
react-dom
recharts              # for charts/visualizations
axios                 # HTTP client
```

---

## Open Questions

> [!IMPORTANT]
> **Missing Data Strategy**: The PRD says "reconstruct from historical patterns." For the MVP, should we:
>
> - (A) Log missing data gaps and skip (simpler), or
> - (B) Interpolate missing values from rolling mean (more complex but closer to PRD)?

> [!IMPORTANT]
> **Source Reliability Ranking**: For conflicting events, we need a source priority order. Should we:
>
> - (A) Use a hardcoded ranking (e.g., `exchange-A > exchange-B > internal`), or
> - (B) Make it configurable via an API endpoint?

> [!NOTE]
> **Charting Library**: Plan uses **Recharts** for React visualizations. Let me know if you prefer a different library (e.g., Chart.js, Nivo, D3).

---

## Verification Plan

### Automated Tests

```bash
cd backend && pytest tests/ -v --tb=short
```

### Manual Verification

1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. POST fixture files to `/api/transactions/batch`
4. Observe real-time updates on dashboard
5. Trigger replay via `/api/replay/fixture/01_normal_flow`
6. Compare replay output with original audit trail
7. Verify all 5 fixtures produce expected results
