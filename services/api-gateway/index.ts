import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import routes from './routes';
import { eventBus } from '../../shared/event-bus';

// Initialize Express app
const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Set up event listeners
const setupEventHandlers = () => {
  // Listen for service registration events
  eventBus.subscribe('service-registered', (data) => {
    console.log(`[API Gateway] Service registered: ${JSON.stringify(data)}`);
  });

  // Listen for service deregistration events
  eventBus.subscribe('service-deregistered', (data) => {
    console.log(`[API Gateway] Service deregistered: ${JSON.stringify(data)}`);
  });

  // Listen for service health change events
  eventBus.subscribe('service-health-changed', (data) => {
    console.log(`[API Gateway] Service health changed: ${JSON.stringify(data)}`);
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