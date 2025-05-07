/**
 * Simple test for the message bus functionality (ESM version)
 */
import { createMessageBus } from './shared/communication/message-bus.js';

// Create a simple message bus
const bus = createMessageBus('test-service');

// Subscribe to a topic
bus.subscribe('hello', (data) => {
  console.log('Received message:', data);
});

// Publish to the topic
const messageId = bus.publish('hello', { greeting: 'Hello, world!' });

console.log(`Sent message with ID: ${messageId}`);

// Wait a bit for processing
setTimeout(() => {
  console.log('Test completed');
  process.exit(0);
}, 1000);