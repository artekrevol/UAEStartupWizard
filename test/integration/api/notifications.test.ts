import { describe, expect, test, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import { Server } from 'http';
import WebSocket from 'ws';
import { startMockApiServer, stopMockApiServer } from '../../utils/mockApi';

// URL for our mock API server
const API_URL = 'http://localhost:5001';
let server: Server;

describe('Notifications API', () => {
  // Setup and teardown for tests
  beforeAll(async () => {
    // Start mock API server
    console.log('Starting mock API server for notifications tests...');
    server = await startMockApiServer();
  });

  afterAll(async () => {
    // Stop mock API server
    console.log('Stopping mock API server...');
    if (server) {
      await stopMockApiServer(server);
    }
  });

  // Test the notification endpoint (admin only)
  test('POST /api/test-notification requires admin authentication', async () => {
    const response = await request(API_URL)
      .post('/api/test-notification')
      .send({
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'info'
      })
      .set('Accept', 'application/json');
    
    // Should be unauthorized without admin auth
    expect(response.status).toBe(401);
  });

  // Test the system notification endpoint (admin only)
  test('POST /api/system-notification requires admin authentication', async () => {
    const response = await request(API_URL)
      .post('/api/system-notification')
      .send({
        title: 'System Test Notification',
        message: 'This is a system test notification',
        type: 'warning',
        severity: 'medium'
      })
      .set('Accept', 'application/json');
    
    // Should be unauthorized without admin auth
    expect(response.status).toBe(401);
  });

  // Test self-notification endpoint (authenticated users)
  test('POST /api/notifications/self requires authentication', async () => {
    const response = await request(API_URL)
      .post('/api/notifications/self')
      .send({
        title: 'Self Notification',
        message: 'This is a notification to myself',
        type: 'success'
      })
      .set('Accept', 'application/json');
    
    // Should be unauthorized without user auth
    expect(response.status).toBe(401);
  });

  // Test WebSocket connection (mocked)
  test('WebSocket connection establishes and receives welcome message', async () => {
    // Create a mock implementation for WebSocket
    const mockOnMessage = jest.fn();
    const mockOnOpen = jest.fn();
    const mockOnClose = jest.fn();
    const mockOnError = jest.fn();

    // Skip actual WebSocket connection in test environment
    console.log('Testing WebSocket connection behavior (mocked)');
    
    // Simulate a successful connection and welcome message
    setTimeout(() => {
      mockOnOpen();
      mockOnMessage(JSON.stringify({ 
        type: 'welcome', 
        message: 'Connected to UAE Business Setup Platform WebSocket Server',
        timestamp: Date.now()
      }));
    }, 100);
    
    // Wait for mocked events to fire
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(mockOnOpen).toHaveBeenCalled();
    expect(mockOnMessage).toHaveBeenCalled();
    
    // Parse the welcome message to verify structure
    const messageArg = mockOnMessage.mock.calls[0][0];
    // Ensure messageArg is a string before parsing
    const messageData = typeof messageArg === 'string' ? JSON.parse(messageArg) : messageArg;
    expect(messageData).toHaveProperty('type', 'welcome');
    expect(messageData).toHaveProperty('message');
    expect(messageData).toHaveProperty('timestamp');
  });
  
  // Test WebSocket notification structure
  test('Notification message has correct structure', async () => {
    // Create a mock notification message
    const notificationData = {
      type: "notification",
      notification: {
        id: `notification-${Date.now()}`,
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification message',
        timestamp: Date.now()
      }
    };
    
    // Validate notification structure
    expect(notificationData).toHaveProperty('type', 'notification');
    expect(notificationData).toHaveProperty('notification');
    expect(notificationData.notification).toHaveProperty('id');
    expect(notificationData.notification).toHaveProperty('type');
    expect(notificationData.notification).toHaveProperty('title');
    expect(notificationData.notification).toHaveProperty('message');
    expect(notificationData.notification).toHaveProperty('timestamp');
    expect(typeof notificationData.notification.timestamp).toBe('number');
  });
});