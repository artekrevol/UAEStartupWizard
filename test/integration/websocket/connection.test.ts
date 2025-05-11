import { describe, expect, test, beforeAll, afterAll, jest } from '@jest/globals';
import WebSocket from 'ws';
import { Server } from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';

// Create a simple WebSocket server for testing
let httpServer: Server;
let wss: WebSocketServer;
const TEST_PORT = 5002;
const WS_URL = `ws://localhost:${TEST_PORT}/ws`;

describe('WebSocket Connection', () => {
  beforeAll(async () => {
    // Setup a test WebSocket server
    const app = express();
    httpServer = app.listen(TEST_PORT);
    
    // Create WebSocket server
    wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    
    // Setup connection handler
    wss.on('connection', (ws) => {
      // Send welcome message on connection
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to test WebSocket server',
        timestamp: Date.now()
      }));
      
      // Echo messages back to client
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          // If authentication message, respond with success
          if (data.type === 'auth') {
            ws.send(JSON.stringify({
              type: 'auth_response',
              authenticated: true,
              userId: data.userId || 'test-user',
              timestamp: Date.now()
            }));
          } else {
            // Echo message back
            ws.send(message.toString());
          }
        } catch (error) {
          // Just echo back non-JSON messages
          ws.send(message.toString());
        }
      });
    });
    
    // Wait for server to be ready
    await new Promise<void>((resolve) => {
      httpServer.once('listening', () => {
        console.log(`Test WebSocket server running on port ${TEST_PORT}`);
        resolve();
      });
    });
  });
  
  afterAll(async () => {
    // Cleanup: close the WebSocket server
    await new Promise<void>((resolve) => {
      wss.close(() => {
        httpServer.close(() => {
          console.log('Test WebSocket server closed');
          resolve();
        });
      });
    });
  });
  
  // Test basic WebSocket connection
  test('WebSocket should connect and receive welcome message', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          expect(data).toHaveProperty('type', 'welcome');
          expect(data).toHaveProperty('message');
          expect(data).toHaveProperty('timestamp');
          ws.close();
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      ws.onerror = (error) => {
        reject(error);
      };
    });
  });
  
  // Test WebSocket authentication
  test('WebSocket should handle authentication', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        // Send authentication message
        ws.send(JSON.stringify({
          type: 'auth',
          userId: 'test-user-123',
          token: 'test-token'
        }));
      };
      
      let messageCount = 0;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          messageCount++;
          
          // First message should be welcome
          if (messageCount === 1) {
            expect(data).toHaveProperty('type', 'welcome');
          } 
          // Second message should be auth response
          else if (messageCount === 2) {
            expect(data).toHaveProperty('type', 'auth_response');
            expect(data).toHaveProperty('authenticated', true);
            expect(data).toHaveProperty('userId', 'test-user-123');
            ws.close();
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      };
      
      ws.onerror = (error) => {
        reject(error);
      };
    });
  });
  
  // Test WebSocket message sending and receiving
  test('WebSocket should echo messages back', async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      const testMessage = { type: 'test', data: 'Hello WebSocket!' };
      
      ws.onopen = () => {
        // Skip welcome message and send test message
        setTimeout(() => {
          ws.send(JSON.stringify(testMessage));
        }, 100);
      };
      
      let messageCount = 0;
      ws.onmessage = (event) => {
        try {
          messageCount++;
          
          // Ignore first message (welcome)
          if (messageCount === 1) {
            return;
          }
          
          // Second message should be our echo
          if (messageCount === 2) {
            const data = JSON.parse(event.data.toString());
            expect(data).toEqual(testMessage);
            ws.close();
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      };
      
      ws.onerror = (error) => {
        reject(error);
      };
    });
  });
});