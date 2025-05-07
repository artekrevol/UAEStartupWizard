/**
 * Simple Communication System Test
 * 
 * This script demonstrates the basic functionality of our communication system
 * without relying on imports that might cause issues.
 */

// Very simple message bus implementation for testing
class MessageBus {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.subscriptions = new Map();
    console.log(`[${serviceName}] Message bus initialized`);
  }

  subscribe(topic, handler) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic).push(handler);
    console.log(`[${this.serviceName}] Subscribed to ${topic}`);
    
    return () => {
      const handlers = this.subscriptions.get(topic);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
          console.log(`[${this.serviceName}] Unsubscribed from ${topic}`);
        }
      }
    };
  }

  publish(topic, data) {
    const messageId = Math.random().toString(36).substring(2, 15);
    console.log(`[${this.serviceName}] Publishing to ${topic}:`, data);
    
    const handlers = this.subscriptions.get(topic);
    if (handlers && handlers.length > 0) {
      console.log(`[${this.serviceName}] Found ${handlers.length} subscribers for ${topic}`);
      handlers.forEach(handler => {
        try {
          handler({ data, source: this.serviceName, id: messageId });
        } catch (err) {
          console.error(`[${this.serviceName}] Error in handler for ${topic}:`, err);
        }
      });
    } else {
      console.log(`[${this.serviceName}] No subscribers for ${topic}`);
    }
    
    return messageId;
  }
}

// Create bus instances for different services
const apiGateway = new MessageBus('api-gateway');
const scraperService = new MessageBus('scraper-service');
const documentService = new MessageBus('document-service');

// Set up communication patterns
console.log('\n=== Setting up communication patterns ===\n');

// API Gateway listens for service registrations
apiGateway.subscribe('service.register', (message) => {
  console.log(`[api-gateway] Received registration from ${message.source}:`, message.data);
  
  // Acknowledge registration
  apiGateway.publish('service.registered', {
    name: message.data.name,
    status: 'active',
    message: `Service ${message.data.name} registered successfully`
  });
});

// Scraper service listens for registration confirmations
scraperService.subscribe('service.registered', (message) => {
  console.log(`[scraper-service] Registration confirmed:`, message.data);
});

// Document service listens for scraper updates
documentService.subscribe('scraper.progress', (message) => {
  console.log(`[document-service] Received scraper progress:`, message.data);
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