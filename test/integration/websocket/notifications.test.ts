import { describe, expect, test, beforeAll, afterAll, jest } from '@jest/globals';
import WebSocket from 'ws';
import { Server } from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';

// Create a simple WebSocket notification server for testing
let httpServer: Server;
let wss: WebSocketServer;
const TEST_PORT = 5003;
const WS_URL = `ws://localhost:${TEST_PORT}/ws`;

// Mock authenticated clients storage
const authenticatedClients = new Map<string, WebSocket>();

describe('WebSocket Notifications', () => {
  beforeAll(async () => {
    // Setup a test WebSocket server
    const app = express();
    httpServer = app.listen(TEST_PORT);
    
    // Create WebSocket server
    wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    
    // Setup connection handler
    wss.on('connection', (ws) => {
      // Default client ID - will be overwritten on auth
      let clientId = `anonymous-${Date.now()}`;
      
      // Send welcome message on connection
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to test notification WebSocket server',
        timestamp: Date.now()
      }));
      
      // Handle messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle authentication
          if (data.type === 'auth') {
            clientId = data.userId || clientId;
            authenticatedClients.set(clientId, ws);
            
            ws.send(JSON.stringify({
              type: 'auth_response',
              authenticated: true,
              userId: clientId,
              timestamp: Date.now()
            }));
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        authenticatedClients.delete(clientId);
      });
    });
    
    // Wait for server to be ready
    await new Promise<void>((resolve) => {
      httpServer.once('listening', () => {
        console.log(`Test WebSocket notification server running on port ${TEST_PORT}`);
        resolve();
      });
    });
  });
  
  afterAll(async () => {
    // Cleanup: close the WebSocket server
    await new Promise<void>((resolve) => {
      wss.close(() => {
        httpServer.close(() => {
          console.log('Test WebSocket notification server closed');
          resolve();
        });
      });
    });
  });
  
  // Test function to send notification to a specific user
  const sendNotificationToUser = (userId: string, notification: any) => {
    const client = authenticatedClients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'notification',
        notification
      }));
      return true;
    }
    return false;
  };
  
  // Test function to broadcast notification to all users
  const broadcastNotification = (notification: any) => {
    let sentCount = 0;
    authenticatedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'notification',
          notification
        }));
        sentCount++;
      }
    });
    return sentCount;
  };
  
  // Test receiving a targeted notification
  test('Should receive targeted notifications', async () => {
    return new Promise<void>((resolve, reject) => {
      const userId = `user-${Date.now()}`;
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        // Wait for welcome message then authenticate
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'auth',
            userId
          }));
        }, 100);
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
            
            // Now send a targeted notification
            setTimeout(() => {
              const testNotification = {
                id: `notification-${Date.now()}`,
                title: 'Test Notification',
                message: 'This is a test notification',
                type: 'info',
                timestamp: Date.now()
              };
              
              const sent = sendNotificationToUser(userId, testNotification);
              expect(sent).toBe(true);
            }, 100);
          }
          // Third message should be the notification
          else if (messageCount === 3) {
            expect(data).toHaveProperty('type', 'notification');
            expect(data).toHaveProperty('notification');
            expect(data.notification).toHaveProperty('id');
            expect(data.notification).toHaveProperty('title', 'Test Notification');
            expect(data.notification).toHaveProperty('message', 'This is a test notification');
            expect(data.notification).toHaveProperty('type', 'info');
            expect(data.notification).toHaveProperty('timestamp');
            
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
  
  // Test broadcasting notifications to all clients
  test('Should broadcast notifications to all clients', async () => {
    return new Promise<void>((resolve, reject) => {
      // First client
      const ws1 = new WebSocket(WS_URL);
      const userId1 = `user1-${Date.now()}`;
      
      // Second client
      const ws2 = new WebSocket(WS_URL);
      const userId2 = `user2-${Date.now()}`;
      
      let clientsReady = 0;
      const notificationReceived = { client1: false, client2: false };
      
      // Setup first client
      ws1.onopen = () => {
        // Authenticate after welcome
        setTimeout(() => {
          ws1.send(JSON.stringify({
            type: 'auth',
            userId: userId1
          }));
        }, 100);
      };
      
      ws1.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          
          if (data.type === 'auth_response') {
            clientsReady++;
            checkAndBroadcast();
          } 
          else if (data.type === 'notification') {
            notificationReceived.client1 = true;
            checkCompletion();
          }
        } catch (error) {
          reject(error);
        }
      };
      
      // Setup second client
      ws2.onopen = () => {
        // Authenticate after welcome
        setTimeout(() => {
          ws2.send(JSON.stringify({
            type: 'auth',
            userId: userId2
          }));
        }, 100);
      };
      
      ws2.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          
          if (data.type === 'auth_response') {
            clientsReady++;
            checkAndBroadcast();
          } 
          else if (data.type === 'notification') {
            notificationReceived.client2 = true;
            checkCompletion();
          }
        } catch (error) {
          reject(error);
        }
      };
      
      // Send broadcast when both clients are ready
      function checkAndBroadcast() {
        if (clientsReady === 2) {
          setTimeout(() => {
            const testNotification = {
              id: `broadcast-${Date.now()}`,
              title: 'Broadcast Notification',
              message: 'This is a broadcast notification',
              type: 'system',
              timestamp: Date.now()
            };
            
            const sent = broadcastNotification(testNotification);
            expect(sent).toBe(2); // Both clients should receive it
          }, 200);
        }
      }
      
      // Check if both clients received the notification
      function checkCompletion() {
        if (notificationReceived.client1 && notificationReceived.client2) {
          ws1.close();
          ws2.close();
          resolve();
        }
      }
      
      // Handle errors
      ws1.onerror = ws2.onerror = (error) => {
        reject(error);
      };
    });
  });
});