/**
 * Run the notification and WebSocket tests
 * 
 * This script runs only the specific test files related to notifications and WebSockets
 * to validate the real-time notification system.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('Starting notification and WebSocket tests...');

try {
  // Run API notification tests
  console.log('\n--- Running API notification tests ---');
  execSync('npx jest test/integration/api/notifications.test.ts', { stdio: 'inherit' });
  
  // Run document API tests (since documents generate notifications)
  console.log('\n--- Running API document tests ---');
  execSync('npx jest test/integration/api/documents.test.ts', { stdio: 'inherit' });
  
  // Run WebSocket connection tests
  console.log('\n--- Running WebSocket connection tests ---');
  execSync('npx jest test/integration/websocket/connection.test.ts', { stdio: 'inherit' });
  
  // Run WebSocket notification tests
  console.log('\n--- Running WebSocket notification tests ---');
  execSync('npx jest test/integration/websocket/notifications.test.ts', { stdio: 'inherit' });
  
  console.log('\nAll notification and WebSocket tests completed successfully!');
} catch (error) {
  console.error('Error running tests:', error);
  process.exit(1);
}