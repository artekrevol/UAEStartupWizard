import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected';
type MessageHandler = (data: any) => void;

export interface UseWebSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (event: Event) => void;
  reconnectInterval?: number;
  reconnectAttempts?: number;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Custom hook for WebSocket communication
 */
export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const messageHandlersRef = useRef<Map<string, MessageHandler[]>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const {
    onOpen,
    onClose,
    onError,
    reconnectInterval = 3000,
    reconnectAttempts = 5
  } = options;

  /**
   * Connect to the WebSocket server
   */
  const connect = useCallback(() => {
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    try {
      // Determine the WebSocket URL dynamically based on current protocol and host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      // Create new WebSocket connection
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      setStatus('connecting');
      
      // Setup event handlers
      socket.onopen = () => {
        console.log('WebSocket connection established');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        if (onOpen) onOpen();
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket connection closed', event);
        setStatus('disconnected');
        socketRef.current = null;
        
        if (onClose) onClose();
        
        // Attempt to reconnect if not closed cleanly
        if (!event.wasClean && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${reconnectAttempts})...`);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
      
      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        if (onError) onError(event);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          setLastMessage(data);
          
          // Call appropriate message handlers
          if (data.type && messageHandlersRef.current.has(data.type)) {
            const handlers = messageHandlersRef.current.get(data.type);
            if (handlers) {
              handlers.forEach(handler => handler(data));
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setStatus('disconnected');
    }
  }, [onOpen, onClose, onError, reconnectInterval, reconnectAttempts]);
  
  /**
   * Send a message to the WebSocket server
   */
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  /**
   * Send a ping message to keep the connection alive
   */
  const sendPing = useCallback(() => {
    return sendMessage({ type: 'ping', timestamp: Date.now() });
  }, [sendMessage]);
  
  /**
   * Subscribe to notifications for a specific user
   */
  const subscribeToNotifications = useCallback((userId: number) => {
    return sendMessage({ 
      type: 'notification_subscribe', 
      userId,
      timestamp: Date.now()
    });
  }, [sendMessage]);
  
  /**
   * Add a message handler for a specific message type
   */
  const addMessageHandler = useCallback((type: string, handler: MessageHandler) => {
    if (!messageHandlersRef.current.has(type)) {
      messageHandlersRef.current.set(type, []);
    }
    
    const handlers = messageHandlersRef.current.get(type);
    if (handlers) {
      handlers.push(handler);
    }
    
    // Return a function to remove this handler
    return () => {
      const currentHandlers = messageHandlersRef.current.get(type);
      if (currentHandlers) {
        const index = currentHandlers.indexOf(handler);
        if (index !== -1) {
          currentHandlers.splice(index, 1);
        }
      }
    };
  }, []);
  
  // Effect to establish the connection when the component mounts
  useEffect(() => {
    connect();
    
    // Set up ping interval to keep connection alive
    const pingInterval = setInterval(() => {
      if (status === 'connected') {
        sendPing();
      }
    }, 30000); // 30 seconds
    
    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      clearInterval(pingInterval);
      
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect, sendPing, status]);
  
  return {
    status,
    lastMessage,
    sendMessage,
    sendPing,
    subscribeToNotifications,
    addMessageHandler,
    reconnect: connect
  };
};