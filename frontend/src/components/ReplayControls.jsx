import React, { useState } from 'react';
import { Play, RotateCcw, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const ReplayControls = ({ onReplaySuccess, onResetSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [replayStats, setReplayStats] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const fixtures = [
    { name: '01_normal_flow', label: '1. Normal Flow', desc: 'Happy path sequential events' },
    { name: '02_duplicate_events', label: '2. Duplicates', desc: 'Duplicate IDs checked for idempotency' },
    { name: '03_late_arriving', label: '3. Late Events', desc: 'Out-of-order triggering retroactive recomputation' },
    { name: '04_missing_data', label: '4. Missing Data', desc: 'Telemetry gaps generating interpolated states' },
    { name: '05_conflicting_threshold', label: '5. Conflict/Threshold', desc: 'Source priority rank & boundary Z-scores' }
  ];

  const handleReplayFixture = async (fixtureName) => {
    setLoading(true);
    setError(null);
    setReplayStats(null);
    try {
      const data = await api.replayFixture(fixtureName);
      setReplayStats({
        type: 'fixture',
        name: fixtureName,
        eventCount: data.event_count,
        accounts: Object.keys(data.final_states),
        finalStates: data.final_states
      });
      // Notify parent to fetch new logs/balances
      onReplaySuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Replay failed. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomReplay = async (events) => {
    setLoading(true);
    setError(null);
    setReplayStats(null);
    try {
      const data = await api.replayEvents(events);
      setReplayStats({
        type: 'custom',
        name: 'Uploaded payload',
        eventCount: data.event_count,
        accounts: Object.keys(data.final_states),
        finalStates: data.final_states
      });
      onReplaySuccess();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Replay failed. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    setReplayStats(null);
    try {
      await api.resetEngine();
      onResetSuccess();
    } catch (err) {
      console.error(err);
      setError('Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const events = JSON.parse(event.target.result);
        if (!Array.isArray(events)) {
          throw new Error('Payload must be a JSON array of transactions.');
        }
        handleCustomReplay(events);
      } catch (err) {
        setError(`Invalid JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>Simulation & Temporal Replay</h3>
        <button 
          className="btn-secondary" 
          onClick={handleReset}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger-color)', borderColor: 'rgba(239,68,68,0.2)', padding: '6px 12px', fontSize: '12px' }}
        >
          <RotateCcw size={13} /> Reset Engine
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Preset Fixtures List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>PRE-LOADED COMPLIANCE FIXTURES</h4>
          {fixtures.map((f) => (
            <div
              key={f.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--card-border)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'var(--card-border)';
              }}
            >
              <div style={{ flex: 1, paddingRight: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>{f.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
              
              <button
                className="btn-primary"
                onClick={() => handleReplayFixture(f.name)}
                disabled={loading}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Play size={11} fill="currentColor" /> Run
              </button>
            </div>
          ))}
        </div>

        {/* Custom Upload & Results Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* File Upload zone */}
          <div style={{
            border: '2px dashed var(--card-border)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            background: dragActive ? 'rgba(59,130,246,0.04)' : 'rgba(0,0,0,0.15)',
            borderColor: dragActive ? 'var(--primary-color)' : 'var(--card-border)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s ease'
          }}>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                opacity: 0, cursor: 'pointer'
              }}
            />
            <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', fontWeight: '500' }}>Upload Custom JSON</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Drag & drop transaction list (.json)</div>
          </div>

          {/* Messages & Stats */}
          {loading && (
            <div style={{
              flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
              border: '1px solid var(--card-border)', borderRadius: '12px', background: 'rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <span className="pulse-active" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }} />
                <span>Replaying log deterministically...</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              flex: 1, padding: '12px', background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px',
              display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: '#fca5a5'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, color: 'var(--danger-color)' }} />
              <span>{error}</span>
            </div>
          )}

          {replayStats && !loading && !error && (
            <div style={{
              flex: 1, padding: '12px', background: 'rgba(16,185,129,0.04)',
              border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px',
              display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--success-color)', fontWeight: '600' }}>
                <CheckCircle size={14} /> 100% Deterministic Replay
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Successfully simulated <strong>{replayStats.eventCount}</strong> events for <strong>{replayStats.accounts.length}</strong> accounts.
              </div>

              <div style={{ borderTop: '1px solid rgba(16,185,129,0.1)', paddingTop: '6px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Reconstructed Balances</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                  {Object.entries(replayStats.finalStates).map(([accId, state]) => (
                    <div key={accId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{accId}</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{formatCurrency(state.balance)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!loading && !error && !replayStats && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              border: '1px solid var(--card-border)', borderRadius: '12px', background: 'rgba(255,255,255,0.01)',
              color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '12px'
            }}>
              <FileText size={20} style={{ marginBottom: '6px' }} />
              <span>Select a compliance fixture or upload a custom trade log to trigger deterministic state simulation.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
