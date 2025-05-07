import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import routes from './routes';
import { checkConnection } from './db';
import { eventBus } from '../../shared/event-bus';

// Initialize Express app
const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(json({ limit: '2mb' }));
app.use(urlencoded({ extended: true, limit: '2mb' }));

// API Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Set up event listeners
const setupEventHandlers = () => {
  // Listen for user-related events from other services
  eventBus.subscribe('document-viewed', async (data) => {
    if (data.userId) {
      console.log(`[UserService] Document ${data.documentId} viewed by user ${data.userId}`);
      // Could update user stats or create notifications
    }
  });

  eventBus.subscribe('freezone-updates', async (data) => {
    if (data.userIds && data.userIds.length > 0) {
      console.log(`[UserService] Freezone update notification for ${data.userIds.length} users`);
      // Could create notifications for users who have shown interest in specific free zones
    }
  });
};

// Start the server
const startServer = async () => {
  try {
    // Check database connection
    await checkConnection();
    
    // Set up event handlers
    setupEventHandlers();
    
    // Register service with API Gateway (via event)
    eventBus.publish('service-registered', {
      name: 'user-service',
      host: process.env.USER_SERVICE_HOST || 'localhost',
      port: PORT,
      healthEndpoint: '/health',
      routes: [
        { path: '/api/auth', methods: ['GET', 'POST', 'DELETE'] },
        { path: '/api/users', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
        { path: '/api/admin/users', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
      ],
      timestamp: new Date().toISOString()
    });
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`[UserService] Server running on port ${PORT}`);
      
      // Publish event that User Service is ready
      eventBus.publish('user-service-ready', {
        port: PORT,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('[UserService] Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[UserService] SIGTERM received, shutting down gracefully');
  eventBus.publish('service-deregistered', {
    name: 'user-service',
    timestamp: new Date().toISOString()
  });
  eventBus.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[UserService] SIGINT received, shutting down gracefully');
  eventBus.publish('service-deregistered', {
    name: 'user-service',
    timestamp: new Date().toISOString()
  });
  eventBus.shutdown();
  process.exit(0);
});

export { app };