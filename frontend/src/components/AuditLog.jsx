import React, { useState } from 'react';
import { Download, Search, RefreshCw, Layers } from 'lucide-react';
import { api } from '../services/api';

export const AuditLog = ({ auditLogs, selectedAccount, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [expandedId, setExpandedId] = useState(null);

  const filteredLogs = auditLogs.filter((log) => {
    const accountId = log.state_after.account_id || log.state_before.account_id || '';
    
    // Filter by selected account
    if (selectedAccount && accountId !== selectedAccount) return false;
    
    // Filter by action type
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;

    // Search term match
    const term = searchTerm.toLowerCase();
    return (
      log.event_id.toLowerCase().includes(term) ||
      log.audit_id.toLowerCase().includes(term) ||
      accountId.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.decision.toLowerCase().includes(term)
    );
  });

  const handleExport = () => {
    window.open(api.exportAuditTrail(), '_blank');
  };

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatAmount = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleString([], {
      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: 'var(--primary-color)' }} />
          Immutable Audit Trail {selectedAccount && <span style={{ fontSize: '12px', color: 'var(--primary-color)' }}>({selectedAccount})</span>}
        </h3>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={onRefresh} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px' }}>
            <Download size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search logs by Event ID, Account, Action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-style"
            style={{ width: '100%', paddingLeft: '36px', boxSizing: 'border-box' }}
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="input-style"
          style={{ minWidth: '150px', cursor: 'pointer' }}
        >
          <option value="ALL">All Actions</option>
          <option value="PROCESSED">PROCESSED</option>
          <option value="RETROACTIVE_UPDATE">RETROACTIVE_UPDATE</option>
          <option value="RECONSTRUCTED_GAP">RECONSTRUCTED_GAP</option>
          <option value="DUPLICATE_REJECTED">DUPLICATE_REJECTED</option>
        </select>
      </div>

      {/* Audit table */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--card-border)', borderRadius: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ padding: '12px' }}>Timestamp</th>
              <th style={{ padding: '12px' }}>Action</th>
              <th style={{ padding: '12px' }}>Account ID</th>
              <th style={{ padding: '12px' }}>Event ID</th>
              <th style={{ padding: '12px' }}>Decision</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Balance Shift</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No audit logs match filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedId === log.audit_id;
                const accountId = log.state_after.account_id || log.state_before.account_id;
                
                // Set color badges based on action
                let actionColor = 'var(--text-secondary)';
                if (log.action === 'RETROACTIVE_UPDATE') actionColor = 'var(--warning-color)';
                else if (log.action === 'DUPLICATE_REJECTED') actionColor = 'var(--danger-color)';
                else if (log.action === 'RECONSTRUCTED_GAP') actionColor = '#a855f7';
                else if (log.action === 'PROCESSED') actionColor = 'var(--success-color)';

                const balBefore = log.state_before.balance || 0;
                const balAfter = log.state_after.balance || 0;
                const balDiff = balAfter - balBefore;
                const diffColor = balDiff > 0 ? '#34d399' : balDiff < 0 ? '#f87171' : 'var(--text-muted)';
                const diffSign = balDiff > 0 ? '+' : '';

                return (
                  <React.Fragment key={log.audit_id}>
                    <tr
                      onClick={() => toggleRow(log.audit_id)}
                      style={{
                        borderBottom: '1px solid var(--card-border)',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent')}
                    >
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{formatTime(log.timestamp)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '10px', textTransform: 'uppercase', padding: '2px 6px',
                          borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: actionColor,
                          fontWeight: '600'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{accountId}</td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{log.event_id}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: '600', color: log.decision === 'FLAGGED' ? 'var(--danger-color)' : 'var(--success-color)'
                        }}>
                          {log.decision}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: diffColor }}>
                        {balDiff !== 0 ? `${diffSign}${formatAmount(balDiff)}` : '-'}
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ padding: '12px 24px', background: 'rgba(0, 0, 0, 0.15)', borderBottom: '1px solid var(--card-border)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>State Changes</h4>
                              <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Balance Before</div>
                                  <div style={{ fontWeight: '500' }}>{formatAmount(balBefore)}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Balance After</div>
                                  <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{formatAmount(balAfter)}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Txn Count</div>
                                  <div style={{ fontWeight: '500' }}>{log.state_after.transaction_count || 0}</div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Decision Analysis</h4>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Audit ID:</span>
                                  <span style={{ fontFamily: 'monospace' }}>{log.audit_id}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Reasoning:</span>
                                  <span>{log.reasoning}</span>
                                </div>
                                {log.anomaly_result && (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Z-Score / Threshold:</span>
                                    <span style={{ fontWeight: '500', color: log.decision === 'FLAGGED' ? 'var(--danger-color)' : 'var(--text-main)' }}>
                                      {log.anomaly_result.z_score?.toFixed(2) || '0.00'} / {log.anomaly_result.threshold?.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
