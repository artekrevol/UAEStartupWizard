/**
 * User Service
 * 
 * Microservice for user management, authentication, and authorization
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import routes from './routes';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { config } from '../../shared/config';
import { eventBus } from '../../shared/event-bus';
import { ServiceRegistry } from '../../shared/service-registry';
import { runMigrations } from './migrations/initial';

// Initialize Express app
const app = express();
const PORT = config.userService.port;
const HOST = config.userService.host;

// Initialize service registry
const serviceRegistry = new ServiceRegistry({
  serviceName: 'user-service',
  hostname: HOST,
  port: PORT,
  healthEndpoint: '/health'
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for internal service
  hidePoweredBy: true,
  xssFilter: true,
  noSniff: true
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [config.frontendUrl] 
    : '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Body parsing middleware
app.use(json({ limit: '1mb' }));
app.use(urlencoded({ extended: true, limit: '1mb' }));

// API Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

// Start the server
const startServer = async () => {
  try {
    // Run migrations if needed
    if (process.env.RUN_MIGRATIONS === 'true') {
      await runMigrations();
    }
    
    // Start listening
    app.listen(PORT, HOST, () => {
      console.log(`[UserService] Server running at http://${HOST}:${PORT}`);
      
      // Register with service registry
      serviceRegistry.register();
      
      // Set up health check interval
      setInterval(() => {
        serviceRegistry.sendHeartbeat();
      }, config.serviceRegistry.heartbeatIntervalMs);
      
      // Publish event that service is ready
      eventBus.publish('service-ready', {
        service: 'user-service',
        host: HOST,
        port: PORT,
        timestamp: new Date().toISOString()
      });
    });
    
    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('[UserService] Failed to start server:', error);
    process.exit(1);
  }
};

// Set up event listeners
const setupEventListeners = () => {
  // Listen for health check events
  eventBus.subscribe('health-check', (data) => {
    // Publish health status
    eventBus.publish('health-status', {
      service: 'user-service',
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Listen for user-related events from other services
  eventBus.subscribe('document-created', handleDocumentEvent);
  eventBus.subscribe('document-updated', handleDocumentEvent);
  eventBus.subscribe('document-deleted', handleDocumentEvent);
  
  // Listen for free zone related events
  eventBus.subscribe('freezone-update', handleFreeZoneEvent);
};

// Handle document events (for notifications)
const handleDocumentEvent = async (data: any) => {
  try {
    // If the document is associated with a user, create a notification
    if (data.userId) {
      const userRepository = (await import('./repositories/userRepository')).UserRepository;
      const repo = new userRepository();
      
      await repo.createNotification({
        userId: data.userId,
        title: `Document ${data.action}`,
        message: `Your document "${data.title}" has been ${data.action}.`,
        type: 'document',
        createdAt: new Date()
      });
    }
  } catch (error) {
    console.error(`[UserService] Error handling document event:`, error);
  }
};

// Handle free zone events (for notifications)
const handleFreeZoneEvent = async (data: any) => {
  try {
    // If there's an update to a free zone a user is watching, create a notification
    if (data.watcherUserIds && data.watcherUserIds.length > 0) {
      const userRepository = (await import('./repositories/userRepository')).UserRepository;
      const repo = new userRepository();
      
      for (const userId of data.watcherUserIds) {
        await repo.createNotification({
          userId,
          title: `Free Zone Update: ${data.freeZoneName}`,
          message: `There has been an update to ${data.freeZoneName}: ${data.updateType}`,
          type: 'freezone',
          createdAt: new Date()
        });
      }
    }
  } catch (error) {
    console.error(`[UserService] Error handling free zone event:`, error);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[UserService] SIGTERM received, shutting down gracefully');
  
  // Deregister from service registry
  serviceRegistry.deregister();
  
  // Publish shutdown event
  eventBus.publish('service-shutdown', {
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[UserService] SIGINT received, shutting down gracefully');
  
  // Deregister from service registry
  serviceRegistry.deregister();
  
  // Publish shutdown event
  eventBus.publish('service-shutdown', {
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
  
  process.exit(0);
});

// Start the server
startServer();