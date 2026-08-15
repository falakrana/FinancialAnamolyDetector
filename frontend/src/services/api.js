import axios from 'axios';

const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
const API_BASE_URL = `http://${hostname}:8000/api`;

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Transactions
  ingestTransaction: (event) => client.post('/transactions', event),
  ingestBatch: (events) => client.post('/transactions/batch', events),
  getTransactions: () => client.get('/transactions').then(res => res.data),

  // Account State
  getGlobalState: () => client.get('/state').then(res => res.data),
  getAccountState: (accountId) => client.get(`/state/${accountId}`).then(res => res.data),

  // Anomalies
  getAnomalies: () => client.get('/anomalies').then(res => res.data),
  getAccountAnomalies: (accountId) => client.get(`/anomalies/${accountId}`).then(res => res.data),

  // Audit Logs
  getAuditTrail: () => client.get('/audit').then(res => res.data),
  getAccountAuditTrail: (accountId) => client.get(`/audit/${accountId}`).then(res => res.data),
  exportAuditTrail: () => `${API_BASE_URL}/audit/export`,

  // Replay System
  replayEvents: (events) => client.post('/replay', events).then(res => res.data),
  replayFixture: (fixtureName) => client.post(`/replay/fixture/${fixtureName}`).then(res => res.data),
  resetEngine: () => client.post('/replay/reset').then(res => res.data),
};
