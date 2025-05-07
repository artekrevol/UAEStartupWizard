/**
 * Working Communication System Test
 * 
 * This script demonstrates the basic functionality of our communication system
 * with proper message routing between services.
 */

// Message broker to route messages between services
class MessageBroker {
  constructor() {
    this.subscribers = new Map();
    console.log(`[MessageBroker] Initialized and ready to route messages`);
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
  
  publish(sourceService, topic, data) {
    console.log(`[MessageBroker] Routing message from ${sourceService} to topic ${topic}`);
    
    // Create message envelope
    const messageId = Math.random().toString(36).substring(2, 15);
    const message = {
      id: messageId,
      topic,
      data,
      source: sourceService,
      timestamp: new Date().toISOString()
    };
    
    // Find all subscribers for this topic
    for (const [key, handlers] of this.subscribers.entries()) {
      const [service, subscribedTopic] = key.split(':');
      
      // Check if the topic matches
      if (subscribedTopic === topic) {
        console.log(`[MessageBroker] Delivering to service ${service}`);
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (err) {
            console.error(`[MessageBroker] Error in handler for ${service}:${topic}:`, err);
          }
        });
      }
    }
    
    return messageId;
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
      console.log(`[${this.serviceName}] Received message on topic ${topic}`);
      handler(message.data, message);
    });
  }
  
  publish(topic, data) {
    console.log(`[${this.serviceName}] Publishing to ${topic}`);
    return this.broker.publish(this.serviceName, topic, data);
  }
  
  sendToService(destination, topic, data) {
    // For this simple test, we're just using regular publish
    return this.publish(topic, {
      ...data,
      _destination: destination
    });
  }
}

// Create a shared message broker
const broker = new MessageBroker();

// Create service communicators 
const apiGateway = new ServiceCommunicator('api-gateway', broker);
const scraperService = new ServiceCommunicator('scraper-service', broker);
const documentService = new ServiceCommunicator('document-service', broker);

// Set up API Gateway to listen for service registrations
console.log('\n=== Setting up communication patterns ===\n');

apiGateway.subscribe('service.register', (data, message) => {
  console.log(`[api-gateway] Received registration from ${message.source}:`, data);
  
  // Acknowledge registration
  apiGateway.publish('service.registered', {
    name: data.name,
    status: 'active',
    message: `Service ${data.name} registered successfully`
  });
});

// Scraper service listens for registration confirmations
scraperService.subscribe('service.registered', (data, message) => {
  console.log(`[scraper-service] Registration confirmed:`, data);
});

// Document service listens for scraper progress
documentService.subscribe('scraper.progress', (data, message) => {
  console.log(`[document-service] Received scraper progress:`, data);
});

// Run a test scenario
console.log('\n=== Running test scenario ===\n');

// Register scraper service
scraperService.publish('service.register', {
  name: 'scraper-service',
  host: 'localhost',
  port: 3004,
  routes: [
    { path: '/api/scraper/free-zones', methods: ['POST'] }
  ]
});

// Simulate scraper working
setTimeout(() => {
  console.log('\n=== Simulating scraper activity ===\n');
  
  // Start scraping
  scraperService.publish('scraper.progress', {
    type: 'free-zone',
    status: 'in-progress',
    progress: 0,
    url: 'https://example-freezone.com',
    message: 'Starting to scrape'
  });
  
  // Progress update
  setTimeout(() => {
    scraperService.publish('scraper.progress', {
      type: 'free-zone',
      status: 'in-progress',
      progress: 50,
      url: 'https://example-freezone.com',
      message: 'Halfway through scraping'
    });
  }, 1000);
  
  // Completion
  setTimeout(() => {
    scraperService.publish('scraper.progress', {
      type: 'free-zone',
      status: 'completed',
      progress: 100,
      url: 'https://example-freezone.com',
      message: 'Scraping complete',
      result: {
        documentCount: 5,
        licenseTypes: 3
      }
    });
    
    // Test complete
    setTimeout(() => {
      console.log('\n=== Test complete ===\n');
    }, 500);
  }, 2000);
}, 1000);