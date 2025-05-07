/**
 * Service Communication Demonstration Script
 * 
 * This script demonstrates the communication between microservices
 * using our new message bus system. It simulates services sending
 * messages to each other with different priorities and reliability
 * requirements.
 */
const { createMessageBus, MessagePriority } = require('./shared/communication/message-bus');

// Create message buses for each service
const apiGateway = createMessageBus('api-gateway');
const userService = createMessageBus('user-service');
const documentService = createMessageBus('document-service');
const freezoneService = createMessageBus('freezone-service');
const scraperService = createMessageBus('scraper-service');

// Color formatting for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Formatted logging
function logMessage(service, message, color = colors.reset) {
  console.log(`${color}[${new Date().toISOString().slice(11, 19)}] [${service}]${colors.reset} ${message}`);
}

// Set up service registration
apiGateway.subscribe('service.register', (message) => {
  logMessage('api-gateway', `Received registration from ${message.source}: ${JSON.stringify(message.data)}`, colors.cyan);
  
  apiGateway.publish('service.registered', {
    ...message.data,
    timestamp: new Date().toISOString()
  });
  
  // Send acknowledgment back to the service
  apiGateway.publish(`service.${message.source}.registered`, {
    success: true,
    message: `Service ${message.data.name} successfully registered`,
    timestamp: new Date().toISOString()
  });
});

// Set up health check handlers
apiGateway.subscribe('service.health.check', (message) => {
  logMessage('api-gateway', `Received health check request from ${message.source}`, colors.green);
  
  apiGateway.publish('service.health.status', {
    service: 'api-gateway',
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

userService.subscribe('service.health.check', (message) => {
  logMessage('user-service', `Received health check request from ${message.source}`, colors.green);
  
  userService.publish('service.health.status', {
    service: 'user-service',
    status: 'healthy',
    uptime: Math.floor(Math.random() * 3600),
    timestamp: new Date().toISOString()
  });
});

documentService.subscribe('service.health.check', (message) => {
  logMessage('document-service', `Received health check request from ${message.source}`, colors.green);
  
  documentService.publish('service.health.status', {
    service: 'document-service',
    status: 'healthy',
    uptime: Math.floor(Math.random() * 3600),
    timestamp: new Date().toISOString()
  });
});

freezoneService.subscribe('service.health.check', (message) => {
  logMessage('freezone-service', `Received health check request from ${message.source}`, colors.green);
  
  freezoneService.publish('service.health.status', {
    service: 'freezone-service',
    status: 'healthy',
    uptime: Math.floor(Math.random() * 3600),
    timestamp: new Date().toISOString()
  });
});

scraperService.subscribe('service.health.check', (message) => {
  logMessage('scraper-service', `Received health check request from ${message.source}`, colors.green);
  
  // Simulate occasional failures
  if (Math.random() > 0.2) {
    scraperService.publish('service.health.status', {
      service: 'scraper-service',
      status: 'healthy',
      uptime: Math.floor(Math.random() * 3600),
      timestamp: new Date().toISOString()
    });
  } else {
    logMessage('scraper-service', 'Health check failed - service is busy', colors.red);
    // Health check response is not sent to simulate failure
  }
});

// Subscribe to health status responses
apiGateway.subscribe('service.health.status', (message) => {
  logMessage('api-gateway', `Received health status from ${message.data.service}: ${message.data.status}`, colors.green);
});

// Set up event listeners for all services
apiGateway.subscribe('api-gateway.ready', (message) => {
  logMessage('api-gateway', 'API Gateway is ready!', colors.bright + colors.cyan);
});

userService.subscribe('api-gateway.ready', (message) => {
  logMessage('user-service', 'Received API Gateway ready notification', colors.cyan);
  
  // Register with API Gateway
  userService.publish('service.register', {
    name: 'user-service',
    host: 'localhost',
    port: 3001,
    healthEndpoint: '/health',
    routes: [
      { path: '/api/users', methods: ['GET', 'POST'] },
      { path: '/api/users/:id', methods: ['GET', 'PUT', 'DELETE'] },
      { path: '/api/auth', methods: ['POST'] }
    ]
  }, { priority: MessagePriority.HIGH });
});

documentService.subscribe('api-gateway.ready', (message) => {
  logMessage('document-service', 'Received API Gateway ready notification', colors.cyan);
  
  // Register with API Gateway
  documentService.publish('service.register', {
    name: 'document-service',
    host: 'localhost',
    port: 3002,
    healthEndpoint: '/health',
    routes: [
      { path: '/api/documents', methods: ['GET', 'POST'] },
      { path: '/api/documents/:id', methods: ['GET', 'PUT', 'DELETE'] },
      { path: '/api/categories', methods: ['GET'] }
    ]
  }, { priority: MessagePriority.HIGH });
});

freezoneService.subscribe('api-gateway.ready', (message) => {
  logMessage('freezone-service', 'Received API Gateway ready notification', colors.cyan);
  
  // Register with API Gateway
  freezoneService.publish('service.register', {
    name: 'freezone-service',
    host: 'localhost',
    port: 3003,
    healthEndpoint: '/health',
    routes: [
      { path: '/api/freezones', methods: ['GET', 'POST'] },
      { path: '/api/freezones/:id', methods: ['GET', 'PUT', 'DELETE'] },
      { path: '/api/activities', methods: ['GET'] }
    ]
  }, { priority: MessagePriority.HIGH });
});

scraperService.subscribe('api-gateway.ready', (message) => {
  logMessage('scraper-service', 'Received API Gateway ready notification', colors.cyan);
  
  // Register with API Gateway
  scraperService.publish('service.register', {
    name: 'scraper-service',
    host: 'localhost',
    port: 3004,
    healthEndpoint: '/health',
    routes: [
      { path: '/api/scraper/free-zones', methods: ['POST'] },
      { path: '/api/scraper/establishment-guides', methods: ['POST'] },
      { path: '/api/scraper/free-zone-website', methods: ['POST'] },
      { path: '/api/scraper/schedule', methods: ['POST'] },
      { path: '/api/scraper/status', methods: ['GET'] }
    ]
  }, { priority: MessagePriority.HIGH });
});

// Listen for service registered notifications
userService.subscribe('service.registered', (message) => {
  logMessage('user-service', `Service registered: ${message.data.name}`, colors.cyan);
});

documentService.subscribe('service.registered', (message) => {
  logMessage('document-service', `Service registered: ${message.data.name}`, colors.cyan);
});

freezoneService.subscribe('service.registered', (message) => {
  logMessage('freezone-service', `Service registered: ${message.data.name}`, colors.cyan);
});

scraperService.subscribe('service.registered', (message) => {
  logMessage('scraper-service', `Service registered: ${message.data.name}`, colors.cyan);
});

// Listen for specific service registrations
userService.subscribe('service.user-service.registered', (message) => {
  logMessage('user-service', `Successfully registered with API Gateway: ${message.data.message}`, colors.green);
});

documentService.subscribe('service.document-service.registered', (message) => {
  logMessage('document-service', `Successfully registered with API Gateway: ${message.data.message}`, colors.green);
});

freezoneService.subscribe('service.freezone-service.registered', (message) => {
  logMessage('freezone-service', `Successfully registered with API Gateway: ${message.data.message}`, colors.green);
});

scraperService.subscribe('service.scraper-service.registered', (message) => {
  logMessage('scraper-service', `Successfully registered with API Gateway: ${message.data.message}`, colors.green);
});

// Listen for scraper progress events
scraperService.subscribe('scraper.progress', (message) => {
  logMessage('scraper-service', `Scraping progress: ${message.data.type} - ${message.data.status} (${message.data.progress}%)`, colors.yellow);
});

documentService.subscribe('scraper.progress', (message) => {
  logMessage('document-service', `Received scraper progress: ${message.data.type} - ${message.data.progress}%`, colors.yellow);
});

// Simulation of service-to-service communication
userService.subscribe('document.created', (message) => {
  logMessage('user-service', `Received document creation notification: ${message.data.documentId} for user ${message.data.userId}`, colors.magenta);
});

documentService.subscribe('user.updated', (message) => {
  logMessage('document-service', `Received user update notification: ${message.data.userId}`, colors.magenta);
});

// Run the demonstration
async function runDemo() {
  logMessage('Demo', 'Starting service communication demonstration', colors.bright + colors.blue);
  
  // Announce API Gateway ready
  setTimeout(() => {
    logMessage('Demo', 'API Gateway coming online...', colors.blue);
    apiGateway.publish('api-gateway.ready', {
      timestamp: new Date().toISOString()
    }, { priority: MessagePriority.HIGH });
  }, 500);
  
  // Run a health check after services register
  setTimeout(() => {
    logMessage('Demo', 'Running health checks on all services...', colors.blue);
    
    apiGateway.publish('service.health.check', {
      timestamp: new Date().toISOString()
    });
    
    userService.publish('service.health.check', {
      timestamp: new Date().toISOString()
    });
    
    documentService.publish('service.health.check', {
      timestamp: new Date().toISOString()
    });
    
    freezoneService.publish('service.health.check', {
      timestamp: new Date().toISOString()
    });
    
    scraperService.publish('service.health.check', {
      timestamp: new Date().toISOString()
    });
  }, 2000);
  
  // Simulate document service creating a document
  setTimeout(() => {
    logMessage('Demo', 'Document service creating a new document...', colors.blue);
    
    const documentId = Math.floor(Math.random() * 1000);
    const userId = Math.floor(Math.random() * 100);
    
    documentService.publish('document.created', {
      documentId,
      userId,
      title: 'New Document',
      timestamp: new Date().toISOString()
    }, { priority: MessagePriority.NORMAL });
  }, 3000);
  
  // Simulate user service updating a user
  setTimeout(() => {
    logMessage('Demo', 'User service updating user information...', colors.blue);
    
    const userId = Math.floor(Math.random() * 100);
    
    userService.publish('user.updated', {
      userId,
      fields: ['email', 'profile'],
      timestamp: new Date().toISOString()
    }, { priority: MessagePriority.NORMAL });
  }, 4000);
  
  // Simulate scraper service running a job
  setTimeout(() => {
    logMessage('Demo', 'Scraper service starting a new job...', colors.blue);
    
    // Scraper starting
    scraperService.publish('scraper.progress', {
      type: 'free-zones',
      status: 'in-progress',
      progress: 0,
      message: 'Starting free zones scraping',
      timestamp: new Date().toISOString()
    });
    
    // Scraper halfway
    setTimeout(() => {
      scraperService.publish('scraper.progress', {
        type: 'free-zones',
        status: 'in-progress',
        progress: 50,
        message: 'Identified 12 free zones',
        timestamp: new Date().toISOString()
      });
    }, 1000);
    
    // Scraper completed
    setTimeout(() => {
      scraperService.publish('scraper.progress', {
        type: 'free-zones',
        status: 'completed',
        progress: 100,
        message: 'Completed processing 12 free zones',
        timestamp: new Date().toISOString()
      }, { priority: MessagePriority.HIGH });
    }, 2000);
  }, 5000);
  
  // Simulation of a critical message
  setTimeout(() => {
    logMessage('Demo', 'Sending critical message from API Gateway...', colors.bright + colors.red);
    
    apiGateway.publish('system.alert', {
      type: 'security',
      level: 'critical',
      message: 'Potential security threat detected',
      action: 'rate-limit-increase',
      timestamp: new Date().toISOString()
    }, { priority: MessagePriority.CRITICAL });
  }, 7000);
  
  // Listen for critical system messages
  userService.subscribe('system.alert', (message) => {
    logMessage('user-service', `ALERT: ${message.data.message} (${message.data.level})`, colors.bright + colors.red);
  });
  
  documentService.subscribe('system.alert', (message) => {
    logMessage('document-service', `ALERT: ${message.data.message} (${message.data.level})`, colors.bright + colors.red);
  });
  
  freezoneService.subscribe('system.alert', (message) => {
    logMessage('freezone-service', `ALERT: ${message.data.message} (${message.data.level})`, colors.bright + colors.red);
  });
  
  scraperService.subscribe('system.alert', (message) => {
    logMessage('scraper-service', `ALERT: ${message.data.message} (${message.data.level})`, colors.bright + colors.red);
  });
  
  // Shutdown simulation
  setTimeout(() => {
    logMessage('Demo', 'Simulating API Gateway shutdown...', colors.bright + colors.blue);
    
    apiGateway.publish('api-gateway.shutdown', {
      reason: 'scheduled-maintenance',
      timestamp: new Date().toISOString()
    }, { priority: MessagePriority.CRITICAL });
  }, 9000);
  
  // Listen for API Gateway shutdown
  userService.subscribe('api-gateway.shutdown', (message) => {
    logMessage('user-service', 'API Gateway is shutting down, preparing for disconnection', colors.red);
  });
  
  documentService.subscribe('api-gateway.shutdown', (message) => {
    logMessage('document-service', 'API Gateway is shutting down, preparing for disconnection', colors.red);
  });
  
  freezoneService.subscribe('api-gateway.shutdown', (message) => {
    logMessage('freezone-service', 'API Gateway is shutting down, preparing for disconnection', colors.red);
  });
  
  scraperService.subscribe('api-gateway.shutdown', (message) => {
    logMessage('scraper-service', 'API Gateway is shutting down, preparing for disconnection', colors.red);
  });
  
  // End the demo
  setTimeout(() => {
    logMessage('Demo', 'Service communication demonstration completed', colors.bright + colors.blue);
    process.exit(0);
  }, 10000);
}

// Run the demonstration
runDemo();