import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp, CheckCircle, Info } from 'lucide-react';

export const AnomalyPanel = ({ anomalies, selectedAccount }) => {
  const [expandedId, setExpandedId] = useState(null);

  const filteredAnomalies = selectedAccount
    ? anomalies.filter((a) => a.state_after.account_id === selectedAccount)
    : anomalies;

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
        <ShieldAlert size={20} style={{ color: 'var(--danger-color)' }} />
        <h3 style={{ margin: 0, fontSize: '18px' }}>
          Flagged Anomalies {selectedAccount && <span style={{ fontSize: '12px', color: 'var(--primary-color)' }}>({selectedAccount})</span>}
        </h3>
        <span style={{
          marginLeft: 'auto', background: 'var(--danger-color)', color: 'white',
          fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px'
        }}>
          {filteredAnomalies.length} ALERTS
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
        {filteredAnomalies.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            color: 'var(--text-muted)', border: '1px dashed var(--card-border)', borderRadius: '12px',
            minHeight: '120px', gap: '8px'
          }}>
            <CheckCircle size={28} style={{ color: 'var(--success-color)' }} />
            <span>No anomalies flagged. Everything is within limits.</span>
          </div>
        ) : (
          filteredAnomalies.map((anomaly, idx) => {
            const auditId = anomaly.audit_id || `anom-${idx}`;
            const isExpanded = expandedId === auditId;
            const eventId = anomaly.event_id;
            const accountId = anomaly.state_after.account_id;
            const amount = anomaly.anomaly_result?.rolling_mean ? (anomaly.anomaly_result.z_score * anomaly.anomaly_result.rolling_std + anomaly.anomaly_result.rolling_mean) : 0; // fallback or calculate
            
            // Wait, we can get transaction details if we parse reasoning or if we log amount in state_after or state_before
            // Let's use the reasoning details or a default representation.
            const zScore = anomaly.anomaly_result?.z_score;
            const threshold = anomaly.anomaly_result?.threshold;
            
            return (
              <div
                key={auditId}
                className="anomaly-alert"
                style={{
                  background: 'rgba(239, 68, 68, 0.04)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                }}
              >
                <div 
                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => toggleExpand(auditId)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{accountId}</span>
                      <span style={{
                        fontSize: '9px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)',
                        padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold'
                      }}>
                        Z-SCORE: {zScore?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Event: <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{eventId}</span>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right', marginRight: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatTime(anomaly.timestamp)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{anomaly.action}</div>
                  </div>

                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {isExpanded && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(239, 68, 68, 0.1)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ROLLING MEAN</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>
                          {formatAmount(anomaly.anomaly_result?.rolling_mean || 0)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ROLLING STD</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>
                          {formatAmount(anomaly.anomaly_result?.rolling_std || 0)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>LIMIT THRESHOLD</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '500' }}>
                          {threshold?.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', lineHeight: '1.4' }}>
                      <Info size={14} style={{ color: 'var(--primary-color)', flexShrink: 0, marginTop: '2px' }} />
                      <span>{anomaly.anomaly_result?.reasoning}</span>
                    </div>

                    <div style={{
                      marginTop: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'var(--text-muted)'
                    }}>
                      <span>Bal Before: {formatAmount(anomaly.state_before.balance)}</span>
                      <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>
                        Bal After: {formatAmount(anomaly.state_after.balance)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
