# Inter-Service Communication System

We've implemented a robust communication system between microservices that ensures reliable message delivery with error handling. This system allows our services to communicate with each other without tight coupling, making our architecture more resilient and scalable.

## Key Components

1. **Message Bus** (`shared/communication/message-bus.ts`)
   - Core message passing system with publish/subscribe functionality
   - Guarantees message delivery with retries
   - Preserves critical messages to disk for reliability
   - Supports message prioritization (LOW, NORMAL, HIGH, CRITICAL)

2. **Service Communicator** (`shared/communication/service-communicator.ts`)
   - Simplified API for services to communicate
   - Handles service registration and discovery
   - Provides request-response patterns
   - Implements health check mechanisms

3. **API Gateway Integration** (`services/api-gateway/messaging.ts`)
   - Central hub for routing messages between services
   - Handles service registry updates
   - Manages service health monitoring

## How It Works

### 1. Service Registration

When a service starts up, it registers with the API Gateway:

```typescript
// In scraper-service/index.ts
communicator.sendToService('api-gateway', 'service.register', {
  name: SERVICE_NAME,
  host: process.env.SCRAPER_SERVICE_HOST || 'localhost',
  port: Number(PORT),
  healthEndpoint: '/health',
  routes: [
    { path: '/api/scraper/free-zones', methods: ['POST'] },
    { path: '/api/scraper/establishment-guides', methods: ['POST'] },
    // other routes...
  ]
}, { priority: MessagePriority.HIGH });
```

The API Gateway receives this registration and updates its service registry:

```typescript
// In api-gateway/messaging.ts
communicator.onMessage('service.register', (data, message) => {
  // Register the service in the registry
  serviceRegistry.register({
    name: data.name,
    host: data.host,
    port: data.port,
    health: data.healthEndpoint || '/health',
    routes: data.routes || []
  });
  
  // Confirm registration to the service
  communicator.sendToService(data.name, 'service.registered', {
    success: true,
    message: `Service ${data.name} registered successfully`
  });
});
```

### 2. Health Checking

Services periodically check each other's health:

```typescript
// API Gateway checks a service's health
communicator.sendToService('scraper-service', 'service.health.check', {
  requestId: 'health-check-123',
  timestamp: new Date().toISOString()
});

// Service responds with its health status
communicator.onMessage('service.health.check', (data, message) => {
  communicator.respond(data, {
    service: SERVICE_NAME,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
```

### 3. Service-to-Service Communication

Services can communicate directly with each other:

```typescript
// Document service notifies about new document
documentService.broadcast('document.created', {
  documentId: 123,
  title: 'New Document',
  timestamp: new Date().toISOString()
});

// User service listens for document events
userService.onMessage('document.created', (data) => {
  console.log(`New document created: ${data.documentId}`);
  // Update user's recent activity
});
```

### 4. Request-Response Pattern

For synchronous operations, services can use request-response:

```typescript
// Service A requests information from Service B
const result = await serviceA.request('service-b', 'get.user.details', {
  userId: 123
});

// Service B handles the request
serviceB.onMessage('get.user.details', (data, message) => {
  // Fetch user data
  const userData = { name: 'John', email: 'john@example.com' };
  
  // Send response back
  serviceB.respond(data, userData);
});
```

### 5. Critical Message Handling

Critical messages are persisted and guaranteed to be delivered:

```typescript
// Send a critical security alert
apiGateway.broadcast('system.alert', {
  type: 'security',
  level: 'critical',
  message: 'Potential security breach detected',
  timestamp: new Date().toISOString()
}, { priority: MessagePriority.CRITICAL });

// All services should handle this alert
scraperService.onMessage('system.alert', (data) => {
  if (data.level === 'critical') {
    // Take immediate action
    console.error(`CRITICAL ALERT: ${data.message}`);
    // Implement security measures
  }
});
```

## Error Handling

The system includes robust error handling:

1. **Message Delivery Failures**
   - Messages are retried based on priority (CRITICAL messages retry indefinitely)
   - Exponential backoff prevents overwhelming the system
   - Detailed error logging for debugging

2. **Service Unavailability**
   - If a service is unreachable, messages are queued for later delivery
   - Services periodically announce their availability
   - API Gateway tracks service health and routes accordingly

3. **Network Failures**
   - Transient failures are automatically retried
   - Critical messages are persisted to disk for delivery after recovery
   - Detailed error reporting through event system

## Benefits of This Approach

1. **Loose Coupling**: Services don't need to know implementation details of other services
2. **Resilience**: System continues functioning even if some services are down
3. **Scalability**: New services can be added without modifying existing ones
4. **Reliability**: Critical messages are guaranteed to be delivered
5. **Observability**: Service health and message flow are easy to monitor

## Implementation Details

The implementation is entirely in TypeScript without external dependencies beyond the standard Node.js libraries. This approach ensures:

1. No vendor lock-in to specific message brokers
2. Simple deployment without additional infrastructure
3. Easy testing and debugging
4. Lightweight runtime with minimal overhead

This communication system forms the backbone of our microservices architecture, enabling reliable and fault-tolerant interactions between services.