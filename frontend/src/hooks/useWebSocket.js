import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = (url = 'ws://127.0.0.1:8000/ws/live') => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const listenersRef = useRef(new Set());

  const connect = useCallback(() => {
    if (socketRef.current) return;

    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected to', url);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        listenersRef.current.forEach(listener => listener(data));
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      socketRef.current = null;
      console.log('WebSocket closed, attempting reconnect in 3s...', event.reason);
      
      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };
  }, [url]);

  const subscribe = useCallback((callback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const send = useCallback((message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof message === 'string' ? message : JSON.stringify(message));
    } else {
      console.warn('Cannot send message, WebSocket is not open.');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.onclose = null; // Prevent reconnect loop
        socketRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastMessage, subscribe, send };
};
