import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

export const StatsCharts = ({ auditLogs, selectedAccount }) => {
  // Filter and sort logs by timestamp
  const sortedLogs = [...auditLogs]
    .filter((log) => {
      const accountId = log.state_after.account_id || log.state_before.account_id;
      return !selectedAccount || accountId === selectedAccount;
    })
    .sort((a, b) => new Date(a.state_after.last_updated || a.timestamp) - new Date(b.state_after.last_updated || b.timestamp));

  // Map to chart data format
  const chartData = sortedLogs
    .filter(log => log.anomaly_result) // only show records that have anomaly metrics
    .map((log) => {
      const ts = log.state_after.last_updated || log.timestamp;
      const amount = log.anomaly_result.rolling_mean !== null 
        ? log.anomaly_result.z_score * log.anomaly_result.rolling_std + log.anomaly_result.rolling_mean // calculate approximate transaction size
        : 0;

      return {
        time: new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        zScore: parseFloat(log.anomaly_result.z_score?.toFixed(2) || 0),
        rollingMean: parseFloat(log.anomaly_result.rolling_mean?.toFixed(2) || 0),
        rollingStd: parseFloat(log.anomaly_result.rolling_std?.toFixed(2) || 0),
        isAnomaly: log.anomaly_result.is_anomaly
      };
    });

  const hasData = chartData.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} style={{ color: 'var(--primary-color)' }} />
          Statistical Visualizations {selectedAccount && <span style={{ fontSize: '12px', color: 'var(--primary-color)' }}>({selectedAccount})</span>}
        </h3>
      </div>

      {!hasData ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          color: 'var(--text-muted)', border: '1px dashed var(--card-border)', borderRadius: '12px',
          minHeight: '180px', gap: '8px'
        }}>
          <BarChart3 size={32} style={{ color: 'var(--text-muted)' }} />
          <span>No statistical data available yet. Ingest events to plot rolling averages and Z-scores.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
          {/* Chart 1: Rolling average line chart */}
          <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '10px', color: 'var(--text-secondary)' }}>
              NumPy Rolling Average (10-Min Window)
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#111827', borderColor: 'var(--card-border)', borderRadius: '8px', color: '#fff' }}
                    labelStyle={{ color: 'var(--text-muted)', fontSize: '11px' }}
                  />
                  <Legend verticalAlign="top" height={24} fontSize={11} iconType="circle" />
                  <Line 
                    name="Rolling Mean ($)" 
                    type="monotone" 
                    dataKey="rollingMean" 
                    stroke="var(--primary-color)" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'var(--primary-color)' }}
                  />
                  <Line 
                    name="Rolling Std ($)" 
                    type="monotone" 
                    dataKey="rollingStd" 
                    stroke="var(--warning-color)" 
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Z-scores over time with anomaly threshold line */}
          <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '10px', color: 'var(--text-secondary)' }}>
              Z-Scores and Anomaly Flags
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} domain={[0, 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{ background: '#111827', borderColor: 'var(--card-border)', borderRadius: '8px', color: '#fff' }}
                    labelStyle={{ color: 'var(--text-muted)', fontSize: '11px' }}
                  />
                  <ReferenceLine 
                    y={3.0} 
                    stroke="var(--danger-color)" 
                    strokeDasharray="4 4" 
                    label={{ value: 'Limit (3.0)', position: 'insideTopLeft', fill: 'var(--danger-color)', fontSize: '9px', fontWeight: 'bold' }} 
                  />
                  <Line 
                    name="Z-Score" 
                    type="monotone" 
                    dataKey="zScore" 
                    stroke="#a855f7" 
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (payload.isAnomaly) {
                        return (
                          <circle key={props.key} cx={cx} cy={cy} r={5} fill="var(--danger-color)" stroke="#fff" strokeWidth={1} className="pulse-active" />
                        );
                      }
                      return <circle key={props.key} cx={cx} cy={cy} r={3} fill="#a855f7" />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
