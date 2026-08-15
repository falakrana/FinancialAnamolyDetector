import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';
import { AccountStateView } from './AccountStateView';
import { TransactionFeed } from './TransactionFeed';
import { AnomalyPanel } from './AnomalyPanel';
import { AuditLog } from './AuditLog';
import { ReplayControls } from './ReplayControls';
import { StatsCharts } from './StatsCharts';
import { ShieldCheck, AlertOctagon, Terminal } from 'lucide-react';

export const Dashboard = () => {
  const [accounts, setAccounts] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [systemAlert, setSystemAlert] = useState(null);

  const { isConnected, subscribe } = useWebSocket();

  // Helper to fetch all state data from REST API
  const fetchAllData = useCallback(async () => {
    try {
      const [accountsData, auditData, txnsData] = await Promise.all([
        api.getGlobalState(),
        api.getAuditTrail(),
        api.getTransactions()
      ]);
      
      setAccounts(accountsData);
      setAuditLogs(auditData);
      setTransactions(txnsData);
      
      // Filter anomalies from audit trail
      const flaggedAnoms = auditData.filter(log => log.anomaly_result?.is_anomaly);
      setAnomalies(flaggedAnoms);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, []);

  // Fetch initial data on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle WebSocket updates
  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      const { type, data } = message;
      console.log('WS Message:', type, data);

      if (type === 'TRANSACTION_PROCESSED') {
        const { event, was_late, interpolated_event } = data;
        
        // If late-arriving or interpolated event was created, the historical timeline was retroactively modified.
        // We must pull the fresh, recalculated logs and states from the backend to ensure absolute consistency!
        if (was_late || interpolated_event) {
          fetchAllData();
          setSystemAlert({
            type: 'warning',
            message: `Retroactive correction: ${was_late ? 'Out-of-order event' : 'Reconstructed telemetry gap'} processed. Historical timeline recomputed.`
          });
          setTimeout(() => setSystemAlert(null), 5000);
        } else {
          // Normal sequential append
          setTransactions(prev => [event, ...prev]);
          if (data.audit_entry) {
            setAuditLogs(prev => [data.audit_entry, ...prev]);
          }
        }
      } 
      
      else if (type === 'ANOMALY_DETECTED') {
        // Append anomaly
        setAnomalies(prev => [data, ...prev]);
        setSystemAlert({
          type: 'danger',
          message: `ANOMALY ALERT: Account ${data.state_after.account_id} flagged for Z-score deviation of ${data.anomaly_result.z_score?.toFixed(2)}!`
        });
        setTimeout(() => setSystemAlert(null), 6000);
      } 
      
      else if (type === 'STATE_UPDATED') {
        // Update specific account state
        setAccounts(prev => ({
          ...prev,
          [data.account_id]: data
        }));
      }
      
      else if (type === 'TRANSACTION_REJECTED') {
        setSystemAlert({
          type: 'info',
          message: `Transaction Rejected: ${data.reason}`
        });
        setTimeout(() => setSystemAlert(null), 4000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe, fetchAllData]);

  const handleReplaySuccess = () => {
    fetchAllData();
    setSystemAlert({
      type: 'success',
      message: 'Deterministic replay complete. Historical timeline reconstructed.'
    });
    setTimeout(() => setSystemAlert(null), 4000);
  };

  const handleResetSuccess = () => {
    setAccounts({});
    setTransactions([]);
    setAnomalies([]);
    setAuditLogs([]);
    setSelectedAccount(null);
    setSystemAlert({
      type: 'info',
      message: 'System state engine cleared.'
    });
    setTimeout(() => setSystemAlert(null), 4000);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', boxSizing: 'border-box' }}>
      
      {/* Top Banner Navigation */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--card-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary-color), #4f46e5)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.4)'
          }}>
            <ShieldCheck size={24} style={{ color: 'white' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>MyOnsite financial anomaly detector</h1>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Real-time High-Frequency Trading Telemetry Stream
            </span>
          </div>
        </div>
      </header>

      {/* Floating System Alerts Banner */}
      {systemAlert && (
        <div 
          className="anomaly-alert"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: '10px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid',
            background: 
              systemAlert.type === 'danger' ? 'rgba(239, 68, 68, 0.9)' :
              systemAlert.type === 'warning' ? 'rgba(245, 158, 11, 0.9)' :
              systemAlert.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(59, 130, 246, 0.9)',
            borderColor: 
              systemAlert.type === 'danger' ? 'var(--danger-color)' :
              systemAlert.type === 'warning' ? 'var(--warning-color)' :
              systemAlert.type === 'success' ? 'var(--success-color)' : 'var(--primary-color)',
            color: 'white'
          }}
        >
          <AlertOctagon size={18} />
          <span>{systemAlert.message}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Row 1: Account Balances */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <AccountStateView 
            accounts={accounts} 
            selectedAccount={selectedAccount} 
            onSelectAccount={setSelectedAccount} 
          />
        </div>

        {/* Row 2: Charts & Live Anomalies side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '20px', minHeight: '320px' }}>
            <StatsCharts auditLogs={auditLogs} selectedAccount={selectedAccount} />
          </div>
          <div className="glass-card" style={{ padding: '20px', height: '320px', display: 'flex', flexDirection: 'column' }}>
            <AnomalyPanel anomalies={anomalies} selectedAccount={selectedAccount} />
          </div>
        </div>

        {/* Row 3: Live Feed & Replay Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '20px', height: '400px' }}>
            <TransactionFeed transactions={transactions} selectedAccount={selectedAccount} />
          </div>
          <div className="glass-card" style={{ padding: '20px', height: '400px' }}>
            <ReplayControls onReplaySuccess={handleReplaySuccess} onResetSuccess={handleResetSuccess} />
          </div>
        </div>

        {/* Row 4: Audit Logs (Expandable Table) */}
        <div className="glass-card" style={{ padding: '20px', minHeight: '350px' }}>
          <AuditLog 
            auditLogs={auditLogs} 
            selectedAccount={selectedAccount} 
            onRefresh={fetchAllData} 
          />
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
