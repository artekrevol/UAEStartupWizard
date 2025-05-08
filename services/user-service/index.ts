/**
 * User Service
 * 
 * Microservice responsible for user management, authentication, and authorization
 */
import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from '../../shared/config';
import routes from './routes';
import { connectDb, disconnectDb, migrateDb } from './db';
import { EventBus } from '../../shared/event-bus';
import { applySecurity } from '../../shared/middleware/security';
import { authenticateService } from '../../shared/middleware/serviceAuth';

// Initialize Express
const app: Express = express();
const PORT = config.userService.port;
const HOST = config.userService.host;

// Initialize EventBus for cross-service communication
const eventBus = new EventBus('user-service');

// Connect to database
async function init() {
  try {
    // Connect to the database
    await connectDb();
    console.log('Connected to database');

    // Run migrations if not in production
    if (config.env !== 'production') {
      await migrateDb();
      console.log('Database migrations completed');
    }

    // Apply comprehensive security middleware
    applySecurity(app);
    
    // CORS configuration
    app.use(
      cors({
        origin: config.apiGateway.corsOrigin,
        credentials: true,
      })
    );

    // Body parsing
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));
    app.use(cookieParser(config.security.cookieSecret));
    
    // Add service authentication for inter-service communication
    app.use('/api/internal', authenticateService);

    // Register routes
    app.use('/api', routes);

    // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log(`User service running at http://${HOST}:${PORT}`);
    });

    // Handle shutdown gracefully
    process.on('SIGTERM', () => shutdown(server));
    process.on('SIGINT', () => shutdown(server));

    // Register with EventBus
    await eventBus.connect();
    console.log('Connected to event bus');

    // Set up event listeners
    setupEventListeners();

    return { app, server, eventBus };
  } catch (error) {
    console.error('Failed to initialize user service:', error);
    process.exit(1);
  }
}

// Set up event listeners for cross-service communication
function setupEventListeners() {
  // Listen for relevant events from other services
  eventBus.subscribe('document.created', async (data) => {
    console.log('Document created event received:', data);
    // Handle document creation if needed for user notifications
  });

  eventBus.subscribe('freezone.updated', async (data) => {
    console.log('Free zone updated event received:', data);
    // Handle free zone updates if needed for user notifications
  });

  // Subscribe to user deletion events to clean up related data
  eventBus.subscribe('user.deleted', async (data) => {
    console.log('User deleted event received:', data);
    // This service publishes this event, but other services might need to clean up
  });
}

// Graceful shutdown
async function shutdown(server: any) {
  console.log('Shutting down user service...');
  
  server.close(async () => {
    console.log('HTTP server closed');
    
    try {
      // Disconnect from event bus
      await eventBus.disconnect();
      console.log('Disconnected from event bus');
      
      // Disconnect from database
      await disconnectDb();
      console.log('Disconnected from database');
      
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
}

// If this file is run directly, start the service
if (require.main === module) {
  init();
}

export { init };