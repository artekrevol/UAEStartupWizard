/**
 * Simple test for the message bus functionality
 */
const { MessageBus } = require('./shared/communication/message-bus');

// Create a simple message bus
const bus = new MessageBus('test-service');

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