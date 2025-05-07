/**
 * Priority and Reliability Test for Communication System
 * 
 * This script demonstrates message prioritization and reliability features
 * of our communication system.
 */

// Message priority levels
const MessagePriority = {
  LOW: 0,     // Non-critical, best-effort delivery
  NORMAL: 1,  // Standard priority, few retries
  HIGH: 2,    // Important operations, multiple retries
  CRITICAL: 3 // Critical operations, unlimited retries, persistent storage
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
    console.log(`[MessageBroker] Service ${serviceName} subscribed to ${topic}`);
    
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
    const maxRetries = options.retries ?? this.getDefaultRetries(priority);
    
    console.log(`[MessageBroker] Queueing message from ${sourceService} to topic ${topic} (priority: ${this.getPriorityName(priority)})`);
    
    // Create message envelope
    const messageId = Math.random().toString(36).substring(2, 15);
    const message = {
      id: messageId,
      topic,
      data,
      source: sourceService,
      timestamp: new Date().toISOString(),
      priority,
      attempts: 0,
      maxRetries
    };
    
    // Add to queue with priority
    this.messageQueue.push({
      message,
      nextAttempt: Date.now()
    });
    
    // Sort queue by priority (higher priority first)
    this.messageQueue.sort((a, b) => b.message.priority - a.message.priority);
    
    return messageId;
  }
  
  async processQueue() {
    if (this.processingQueue) return;
    
    this.processingQueue = true;
    
    try {
      const now = Date.now();
      const readyMessages = this.messageQueue.filter(item => item.nextAttempt <= now);
      
      // Keep messages that aren't ready yet
      this.messageQueue = this.messageQueue.filter(item => item.nextAttempt > now);
      
      // Process ready messages
      for (const item of readyMessages) {
        await this.deliverMessage(item.message);
      }
    } catch (error) {
      console.error(`[MessageBroker] Error processing queue:`, error);
    } finally {
      this.processingQueue = false;
      
      // Schedule next run
      setTimeout(() => this.processQueue(), 100);
    }
  }
  
  async deliverMessage(message) {
    console.log(`[MessageBroker] Delivering message to topic ${message.topic} (attempt ${message.attempts + 1}/${message.maxRetries})`);
    
    // Find all subscribers for this topic
    let delivered = false;
    
    for (const [key, handlers] of this.subscribers.entries()) {
      const [service, subscribedTopic] = key.split(':');
      
      // Check if the topic matches
      if (subscribedTopic === message.topic) {
        try {
          console.log(`[MessageBroker] Delivering to service ${service}`);
          
          for (const handler of handlers) {
            try {
              await handler(message);
              delivered = true;
            } catch (err) {
              console.error(`[MessageBroker] Error in handler for ${service}:${message.topic}:`, err);
            }
          }
        } catch (error) {
          console.error(`[MessageBroker] Delivery error for ${service}:`, error);
        }
      }
    }
    
    // If not delivered and we have retries left, requeue with backoff
    if (!delivered && message.attempts < message.maxRetries) {
      message.attempts++;
      const backoff = Math.min(Math.pow(2, message.attempts) * 100, 5000); // Exponential backoff up to 5 seconds
      
      console.log(`[MessageBroker] Message not delivered, requeuing with backoff ${backoff}ms (attempt ${message.attempts}/${message.maxRetries})`);
      
      this.messageQueue.push({
        message,
        nextAttempt: Date.now() + backoff
      });
      
      // Re-sort queue by priority
      this.messageQueue.sort((a, b) => b.message.priority - a.message.priority);
    } else if (!delivered) {
      console.warn(`[MessageBroker] Message to ${message.topic} not delivered after ${message.attempts} attempts, giving up`);
    } else {
      console.log(`[MessageBroker] Message to ${message.topic} delivered successfully`);
    }
  }
  
  getDefaultRetries(priority) {
    switch (priority) {
      case MessagePriority.LOW: return 1;
      case MessagePriority.NORMAL: return 3;
      case MessagePriority.HIGH: return 10;
      case MessagePriority.CRITICAL: return 100; // Simulating "unlimited" for the test
      default: return 3;
    }
  }
  
  getPriorityName(priority) {
    switch (priority) {
      case MessagePriority.LOW: return 'LOW';
      case MessagePriority.NORMAL: return 'NORMAL';
      case MessagePriority.HIGH: return 'HIGH';
      case MessagePriority.CRITICAL: return 'CRITICAL';
      default: return 'UNKNOWN';
    }
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
    return this.broker.subscribe(this.serviceName, topic, async (message) => {
      console.log(`[${this.serviceName}] Received message on topic ${topic} (priority: ${this.getPriorityName(message.priority)})`);
      
      // Simulate service availability issues for testing
      if (this.serviceName === 'unstable-service' && Math.random() < 0.7) {
        console.error(`[${this.serviceName}] Service temporarily unavailable`);
        throw new Error('Service temporarily unavailable');
      }
      
      await handler(message.data, message);
    });
  }
  
  publish(topic, data, options = {}) {
    console.log(`[${this.serviceName}] Publishing to ${topic}`);
    return this.broker.publish(this.serviceName, topic, data, options);
  }
  
  getPriorityName(priority) {
    switch (priority) {
      case MessagePriority.LOW: return 'LOW';
      case MessagePriority.NORMAL: return 'NORMAL';
      case MessagePriority.HIGH: return 'HIGH';
      case MessagePriority.CRITICAL: return 'CRITICAL';
      default: return 'UNKNOWN';
    }
  }
}

// Create a shared message broker
const broker = new MessageBroker();

// Create service communicators
const apiGateway = new ServiceCommunicator('api-gateway', broker);
const stableService = new ServiceCommunicator('stable-service', broker);
const unstableService = new ServiceCommunicator('unstable-service', broker);

// Setup subscriptions
console.log('\n=== Setting up priority and reliability test ===\n');

// Stable service always responds
stableService.subscribe('test.message', async (data, message) => {
  console.log(`[stable-service] Processing message: ${data.content}`);
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log(`[stable-service] Successfully processed message`);
});

// Unstable service has random failures
unstableService.subscribe('test.message', async (data, message) => {
  console.log(`[unstable-service] Attempting to process message: ${data.content}`);
  // Unstable service has additional failures simulated in the subscribe method
  await new Promise(resolve => setTimeout(resolve, 300));
  console.log(`[unstable-service] Successfully processed message`);
});

// Run tests
console.log('\n=== Running priority & reliability tests ===\n');

// Test 1: Send low priority message to unstable service
console.log('\n-> Test 1: Low priority message to unstable service (should fail after few retries)');
unstableService.publish('test.message', { 
  content: 'Low priority message',
  timestamp: new Date().toISOString()
}, { priority: MessagePriority.LOW });

// Test 2: Send normal priority message to stable service
setTimeout(() => {
  console.log('\n-> Test 2: Normal priority message to stable service (should succeed)');
  stableService.publish('test.message', { 
    content: 'Normal priority message',
    timestamp: new Date().toISOString()
  }, { priority: MessagePriority.NORMAL });
}, 2000);

// Test 3: Send high priority message to unstable service
setTimeout(() => {
  console.log('\n-> Test 3: High priority message to unstable service (should eventually succeed)');
  unstableService.publish('test.message', {
    content: 'High priority message',
    timestamp: new Date().toISOString()
  }, { priority: MessagePriority.HIGH, retries: 5 }); // More retries for test
}, 4000);

// Test 4: Send critical message that must be delivered
setTimeout(() => {
  console.log('\n-> Test 4: Critical message (should persist until delivery)');
  apiGateway.publish('test.message', {
    content: 'CRITICAL SECURITY ALERT',
    severity: 'high',
    timestamp: new Date().toISOString()
  }, { priority: MessagePriority.CRITICAL });
}, 6000);

// End the test after all messages have been processed
setTimeout(() => {
  console.log('\n=== Test complete ===\n');
  process.exit(0);
}, 15000);