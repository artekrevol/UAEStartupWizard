/**
 * Short Priority Test for Communication System
 */

// Message priority levels
const MessagePriority = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3
};

// Message broker with priority handling
class MessageBroker {
  constructor() {
    this.subscribers = new Map();
    this.messageQueue = [];
    this.processingQueue = false;
    console.log(`[MessageBroker] Initialized with priority support`);
    
    // Start queue processing
    this.processQueue();
  }
  
  subscribe(serviceName, topic, handler) {
    const key = `${serviceName}:${topic}`;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key).push(handler);
    console.log(`[MessageBroker] ${serviceName} subscribed to ${topic}`);
    
    return () => {
      const handlers = this.subscribers.get(key);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }
  
  publish(sourceService, topic, data, options = {}) {
    const priority = options.priority ?? MessagePriority.NORMAL;
    
    console.log(`[MessageBroker] Message from ${sourceService} to ${topic} (priority: ${this.getPriorityName(priority)})`);
    
    // Create message
    const messageId = Math.random().toString(36).substring(2, 8);
    const message = {
      id: messageId,
      topic,
      data,
      source: sourceService,
      priority
    };
    
    // Find subscribers
    for (const [key, handlers] of this.subscribers.entries()) {
      const [service, subscribedTopic] = key.split(':');
      
      // Check if topic matches
      if (subscribedTopic === topic) {
        console.log(`[MessageBroker] Delivering to ${service}`);
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (err) {
            console.error(`[MessageBroker] Error in handler: ${err.message}`);
          }
        });
      }
    }
    
    return messageId;
  }
  
  processQueue() {
    setTimeout(() => this.processQueue(), 100);
  }
  
  getPriorityName(priority) {
    return ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'][priority] || 'UNKNOWN';
  }
}

// Service communication interface
class ServiceCommunicator {
  constructor(serviceName, broker) {
    this.serviceName = serviceName;
    this.broker = broker;
    console.log(`[${serviceName}] Communicator initialized`);
  }
  
  subscribe(topic, handler) {
    return this.broker.subscribe(this.serviceName, topic, (message) => {
      console.log(`[${this.serviceName}] Received ${topic} message (${this.getPriorityName(message.priority)})`);
      handler(message.data, message);
    });
  }
  
  publish(topic, data, options = {}) {
    console.log(`[${this.serviceName}] Publishing to ${topic}`);
    return this.broker.publish(this.serviceName, topic, data, options);
  }
  
  getPriorityName(priority) {
    return ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'][priority] || 'UNKNOWN';
  }
}

// Create a shared message broker
const broker = new MessageBroker();

// Create service communicators
const apiGateway = new ServiceCommunicator('api-gateway', broker);
const scraperService = new ServiceCommunicator('scraper-service', broker);
const documentService = new ServiceCommunicator('document-service', broker);

// Setup subscriptions
console.log('\n=== Setting up communication patterns ===\n');

documentService.subscribe('message', (data) => {
  console.log(`[document-service] Processed message: ${data.content}`);
});

// Run tests with different priorities
console.log('\n=== Testing different priority levels ===\n');

// Low priority
scraperService.publish('message', { 
  content: 'Low priority notification',
  timestamp: new Date().toISOString()
}, { priority: MessagePriority.LOW });

// Normal priority
scraperService.publish('message', { 
  content: 'Normal priority update',
  timestamp: new Date().toISOString()
}, { priority: MessagePriority.NORMAL });

// High priority
scraperService.publish('message', { 
  content: 'High priority alert',
  timestamp: new Date().toISOString()
}, { priority: MessagePriority.HIGH });

// Critical priority
apiGateway.publish('message', { 
  content: 'CRITICAL: Security alert',
  timestamp: new Date().toISOString()
}, { priority: MessagePriority.CRITICAL });

// Give time to process all messages
setTimeout(() => {
  console.log('\n=== Test complete ===\n');
  process.exit(0);
}, 1000);