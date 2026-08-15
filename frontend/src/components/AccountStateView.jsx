import React from 'react';
import { DollarSign, Activity, Clock } from 'lucide-react';

export const AccountStateView = ({ accounts, selectedAccount, onSelectAccount }) => {
  const accountList = Object.values(accounts);

  const formatBalance = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>Active Accounts ({accountList.length})</h3>
        {selectedAccount && (
          <button 
            className="btn-secondary" 
            onClick={() => onSelectAccount(null)}
            style={{ padding: '4px 8px', fontSize: '12px' }}
          >
            Clear Filter
          </button>
        )}
      </div>
      
      {accountList.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
          color: 'var(--text-muted)', border: '1px dashed var(--card-border)', borderRadius: '12px',
          minHeight: '120px'
        }}>
          No active accounts. Ingest transactions to begin.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {accountList.map((account) => {
            const isSelected = selectedAccount === account.account_id;
            const isNegative = account.balance < 0;
            
            return (
              <div
                key={account.account_id}
                className="glass-card"
                onClick={() => onSelectAccount(isSelected ? null : account.account_id)}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--card-border)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--card-bg)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: isSelected ? 'var(--primary-color)' : 'var(--text-main)' }}>
                    {account.account_id}
                  </span>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: isNegative ? 'var(--warning-color)' : 'var(--success-color)',
                    boxShadow: isNegative ? '0 0 8px var(--warning-color)' : '0 0 8px var(--success-color)'
                  }} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <DollarSign size={16} style={{ color: isNegative ? 'var(--warning-color)' : 'var(--success-color)', marginRight: '6px' }} />
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: isNegative ? '#fbbf24' : '#34d399' }}>
                    {formatBalance(account.balance)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Activity size={12} style={{ marginRight: '4px', color: 'var(--text-muted)' }} />
                    <span>{account.transaction_count} txns</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Clock size={12} style={{ marginRight: '4px', color: 'var(--text-muted)' }} />
                    <span>{formatDate(account.last_updated)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
