import React, { useRef, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, AlertTriangle, Info } from 'lucide-react';

export const TransactionFeed = ({ transactions, selectedAccount }) => {
  const containerRef = useRef(null);

  const filteredTxns = selectedAccount
    ? transactions.filter((t) => t.account_id === selectedAccount)
    : transactions;

  // Auto-scroll to top when a new transaction arrives
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [transactions.length]);

  const getTxnTypeStyle = (type, isAnomaly) => {
    if (isAnomaly) {
      return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: 'var(--danger-color)', icon: AlertTriangle };
    }
    
    switch (type) {
      case 'deposit':
        return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', text: 'var(--success-color)', icon: ArrowUpRight };
      case 'sell':
        return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', text: 'var(--primary-color)', icon: ArrowUpRight };
      case 'buy':
        return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', text: 'var(--warning-color)', icon: ArrowDownLeft };
      case 'withdrawal':
        return { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.2)', text: 'var(--text-muted)', icon: ArrowDownLeft };
      case 'interpolated':
        return { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)', text: '#a855f7', icon: Info };
      default:
        return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.08)', text: 'var(--text-main)', icon: Info };
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>
          Transaction Feed {selectedAccount && <span style={{ fontSize: '12px', color: 'var(--primary-color)' }}>({selectedAccount})</span>}
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filteredTxns.length} records</span>
      </div>

      <div 
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '4px'
        }}
      >
        {filteredTxns.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
            color: 'var(--text-muted)', border: '1px dashed var(--card-border)', borderRadius: '12px',
            minHeight: '120px'
          }}>
            No transactions found.
          </div>
        ) : (
          filteredTxns.map((txn, index) => {
            const isAnomaly = txn.is_anomaly || (txn.audit_entry && txn.audit_entry.decision === 'FLAGGED');
            const style = getTxnTypeStyle(txn.type, isAnomaly);
            const Icon = style.icon;

            return (
              <div
                key={txn.id + '-' + index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '10px',
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  transition: 'transform 0.15s ease',
                  position: 'relative'
                }}
              >
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.2)', marginRight: '12px',
                  color: style.text
                }}>
                  <Icon size={16} />
                </div>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{txn.account_id}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{txn.id}</div>
                  </div>

                  <div>
                    <span style={{
                      fontSize: '10px', textTransform: 'uppercase', padding: '2px 6px',
                      borderRadius: '4px', background: 'rgba(0, 0, 0, 0.2)', color: style.text,
                      fontWeight: '600'
                    }}>
                      {txn.type}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{txn.source}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatTime(txn.timestamp)}</div>
                  </div>

                  <div style={{ textAlign: 'right', fontWeight: '600', color: style.text, fontSize: '15px' }}>
                    {formatAmount(txn.amount)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
