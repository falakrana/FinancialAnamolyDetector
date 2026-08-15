Title:  
**Real-Time Financial Anomaly Detection Engine with Temporal State Replay and Auditability**

**Background:**  
You are building a financial anomaly detection system for a high-frequency trading analytics platform. The system ingests time-series transaction data from multiple sources, including internal trading logs and third-party market feeds, and must detect anomalies such as spoofing, wash trading, or regulatory violations. The candidate has extensive experience with NumPy, Pandas, and FastAPI, and has built enterprise-grade ML systems with real-time data pipelines. The challenge lies in reconstructing accurate, consistent states across multiple data streams with conflicting timestamps and missing data, while maintaining replayability and auditability for compliance.

**Problem Statement:**  
Develop a real-time anomaly detection engine that processes asynchronous, out-of-order financial transaction records from multiple sources. Each transaction record contains a timestamp, source identifier, transaction amount, and metadata. The system must maintain a consistent global state of account balances and detect anomalies based on deviations from expected patterns using NumPy-based statistical models. Due to network delays and asynchronous ingestion, events may arrive out-of-order, and some records may be duplicated or missing. The engine must support deterministic replay of events to reconstruct historical states and audit decisions.

**Scope:**  
The system must process real-time financial transaction data streams from multiple sources. It must maintain a global state of account balances, detect anomalies using statistical models, and provide an audit trail of all state changes and decisions. The system must handle late-arriving events, duplicate events, and missing data. It must support replay of events to reconstruct historical states and reproduce decisions.

**MVP Scope:**  
1. **State Reconstruction Engine**: Reconstruct a consistent global state of account balances from asynchronous, out-of-order transaction events. Handle duplicates and missing data using timestamp-based reconciliation and idempotency.  
2. **Anomaly Detection Module**: Use NumPy-based statistical models (e.g., Z-score, rolling mean/std) to detect anomalies in transaction patterns. Support configurable thresholds and model parameters.  
3. **Audit & Replay System**: Maintain an immutable audit trail of all state transitions and anomaly decisions. Support deterministic replay of events to reproduce historical decisions.  

**Advanced/Bonus Scope:**  
- Extend the anomaly detection model to support machine learning-based patterns using Scikit-learn.  
- Add support for real-time visualization of anomaly detection results in the React frontend.  
- Implement a human-in-the-loop review system for flagged transactions.  

**Functional Requirements:**  
1. **Input Processing**: Accept JSON-formatted transaction events with fields: `id`, `timestamp`, `source`, `account_id`, `amount`, `type` (e.g., 'buy', 'sell').  
2. **State Management**: Maintain a global state of account balances that updates on each transaction. Handle duplicates by rejecting or merging based on `id`. Handle missing data by reconstructing from historical patterns.  
3. **Anomaly Detection**: For each transaction, compute a deviation score using NumPy-based statistical models (e.g., Z-score relative to rolling mean/std over 10-minute windows). Flag anomalies if score exceeds threshold.  
4. **Audit Trail**: Log every state change and anomaly decision with: event ID, timestamp, input data, decision, reasoning, and state before/after.  
5. **Replay System**: Support replay of events in chronological order to reconstruct historical states. Replay must produce identical final states and audit outputs.  
6. **Edge Case Handling**:  
   - Duplicate events: Reject or merge based on `id`.  
   - Late events: Process and update state retroactively.  
   - Missing events: Reconstruct from historical patterns.  
   - Conflicting events: Resolve using timestamp ordering and source reliability.  
   - Threshold boundaries: Handle edge cases where deviation scores equal thresholds.  

**Non-Functional Requirements:**  
1. **Determinism**: Identical input and configuration → identical final state and audit output.  
2. **Replayability**: Same event replay → same decision and state.  
3. **Auditability**: All decisions must be explainable with full context.  
4. **Performance**: Process events in real-time with sub-second latency.  
5. **Idempotency**: Same event should not alter state more than once.  

**Constraints:**  
1. Use only Python, JavaScript, TypeScript, React.js, Next.js, FastAPI, Flask, Spring Boot.  
2. Use NumPy for statistical computations.  
3. Do not use ML/LLM libraries unless in Advanced/Bonus.  
4. Do not require external databases or distributed systems.  
5. All data must be processed locally.  

**Deliverables:**  
1. Submission — Public GitHub repository URL (required).  
2. Repository contents —  
   - Backend: FastAPI or Flask server handling transaction ingestion and state management.  
   - Frontend: React/Next.js dashboard showing real-time anomaly detection and audit logs.  
   - Sample datasets: ≥5 fixture files covering interacting edge cases (duplicates, late events, missing data, conflicting events, threshold boundaries).  
   - Audit/decision-trace output: JSON files showing state changes and anomaly decisions.  
3. Test Suite — Automated tests covering all edge cases and replay functionality.  
4. Documentation — README with setup instructions, test steps, and fixture explanations.