import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import { checkConnection } from './db';
import routes from './routes';
import { EventBus } from '../../shared/event-bus';

// Initialize Express app
const app = express();
const PORT = process.env.DOCUMENT_SERVICE_PORT || 3002;

// Initialize event bus for inter-service communication
const eventBus = new EventBus('document-service');

// Middleware
app.use(helmet());
app.use(cors());
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'document-service' });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Handle events from other services
const setupEventHandlers = () => {
  // Listen for user events
  eventBus.subscribe('user-created', async (data) => {
    console.log(`User created event received: ${JSON.stringify(data)}`);
    // Handle user creation event (e.g., initialize user document storage)
  });

  eventBus.subscribe('user-deleted', async (data) => {
    console.log(`User deleted event received: ${JSON.stringify(data)}`);
    // Handle user deletion event (e.g., clean up user documents)
  });

  // Listen for freezone events
  eventBus.subscribe('freezone-created', async (data) => {
    console.log(`Freezone created event received: ${JSON.stringify(data)}`);
    // Handle freezone creation event (e.g., initialize document templates)
  });

  // Additional event handlers would be added here
};

// Register with service registry
const registerWithServiceRegistry = () => {
  console.log('[DocumentService] Registering with service registry...');
  
  const host = process.env.DOCUMENT_SERVICE_HOST || 'localhost';
  const port = parseInt(process.env.DOCUMENT_SERVICE_PORT || '3002', 10);
  
  eventBus.publish('service-registered', {
    name: 'document-service',
    host,
    port,
    healthEndpoint: '/health',
    routes: [
      { path: '/api/documents', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
      { path: '/api/user-documents', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
      { path: '/api/documents/stats', methods: ['GET'] },
      { path: '/api/documents/stats/subcategories', methods: ['GET'] },
      { path: '/api/documents/search', methods: ['POST'] },
      { path: '/api/documents/process-dmcc', methods: ['GET'] },
      { path: '/api/public/documents/process-dmcc', methods: ['GET'] }
    ]
  });
  
  console.log(`[DocumentService] Registered with service registry on ${host}:${port}`);
  
  // Setup heartbeat to keep service active in registry
  setInterval(() => {
    eventBus.publish('service-heartbeat', {
      name: 'document-service',
      status: 'active',
      timestamp: new Date().toISOString()
    });
  }, 30000); // Send heartbeat every 30 seconds
};

// Start the server
const startServer = async () => {
  try {
    // Check database connection
    await checkConnection();
    
    // Setup event handlers
    setupEventHandlers();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`[DocumentService] Server running on port ${PORT}`);
      
      // Register with service registry after server is started
      registerWithServiceRegistry();
    });
  } catch (error) {
    console.error('[DocumentService] Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[DocumentService] SIGTERM received, shutting down gracefully');
  eventBus.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[DocumentService] SIGINT received, shutting down gracefully');
  eventBus.shutdown();
  process.exit(0);
});

export { app, eventBus };