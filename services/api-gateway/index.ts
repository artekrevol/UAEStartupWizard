import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import routes from './routes';
import { eventBus } from '../../shared/event-bus';
import { initServiceRegistry, cleanupInactiveServices } from './middleware/serviceRegistry';
import { registerService, deregisterService } from './routes/health';
import { requestLogger } from './middleware/proxy';
import { globalRateLimiter } from './middleware/rateLimiter';

// Initialize Express app
const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  xssFilter: true,
  noSniff: true,
  hidePoweredBy: true,
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://uae-business-setup.com'] 
    : '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Body parsing middleware
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Global rate limiting
app.use(globalRateLimiter);

// API Routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Initialize service registry
initServiceRegistry();

// Setup periodic cleanup of inactive services
setInterval(cleanupInactiveServices, 5 * 60 * 1000); // Run every 5 minutes

// Set up event listeners
const setupEventHandlers = () => {
  // Listen for service registration events
  eventBus.subscribe('service-registered', (data) => {
    console.log(`[API Gateway] Service registered: ${JSON.stringify(data)}`);
    registerService(data.name, data.host, data.port, data.healthEndpoint);
  });

  // Listen for service deregistration events
  eventBus.subscribe('service-deregistered', (data) => {
    console.log(`[API Gateway] Service deregistered: ${JSON.stringify(data)}`);
    deregisterService(data.name);
  });

  // Listen for service health change events
  eventBus.subscribe('service-health-changed', (data) => {
    console.log(`[API Gateway] Service health changed: ${JSON.stringify(data)}`);
  });
  
  // Listen for API Gateway health check events
  eventBus.subscribe('health-check', (data) => {
    console.log(`[API Gateway] Health check received at ${new Date().toISOString()}`);
    
    // Publish health status back
    eventBus.publish('health-status', {
      service: 'api-gateway',
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  });
};

// Start the server
const startServer = async () => {
  try {
    // Set up event handlers
    setupEventHandlers();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`[API Gateway] Server running on port ${PORT}`);
      
      // Publish event that API Gateway is ready
      eventBus.publish('api-gateway-ready', {
        port: PORT,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('[API Gateway] Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[API Gateway] SIGTERM received, shutting down gracefully');
  eventBus.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[API Gateway] SIGINT received, shutting down gracefully');
  eventBus.shutdown();
  process.exit(0);
});

export { app };