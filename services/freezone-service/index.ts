/**
 * Free Zone Service
 * Microservice for Free Zone data management
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '../../shared/config';
import { logger } from '../../shared/logger';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { notFoundHandler } from '../../shared/middleware/notFoundHandler';
import { ServiceRegistry } from '../../shared/service-registry';
import router from './routes';
import { initEventsHandlers } from './events';

// Initialize the service registry client
const serviceRegistry = new ServiceRegistry(
  'freezone-service',
  config.freezoneService.port,
  config.serviceRegistry.host,
  config.serviceRegistry.port
);

// Create Express app
const app = express();

// Apply middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    service: 'freezone-service',
    method: req.method,
    path: req.path
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'freezone-service',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', router);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Import migration runner
import { runMigration } from './migrations/initial';

// Run the database migration
runMigration()
  .then(() => {
    logger.info('Database migration completed successfully', {
      service: 'freezone-service'
    });
    
    // Initialize event handlers
    initEventsHandlers();
  })
  .catch(error => {
    logger.error('Failed to run database migration', {
      service: 'freezone-service',
      error: error.message
    });
  });

// Start the server
const PORT = config.freezoneService.port || 4001;
app.listen(PORT, () => {
  logger.info(`Free Zone Service running on port ${PORT}`, {
    service: 'freezone-service',
    port: PORT
  });
  
  // Register with the service registry
  serviceRegistry.register()
    .then(() => {
      logger.info('Successfully registered with service registry', {
        service: 'freezone-service'
      });
    })
    .catch(error => {
      logger.error('Failed to register with service registry', {
        service: 'freezone-service',
        error: error.message
      });
    });
});

// Handle graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/**
 * Gracefully shutdown the service
 */
function shutdown() {
  logger.info('Shutting down Free Zone Service', {
    service: 'freezone-service'
  });
  
  // Deregister from service registry
  serviceRegistry.deregister()
    .then(() => {
      logger.info('Successfully deregistered from service registry', {
        service: 'freezone-service'
      });
      process.exit(0);
    })
    .catch(error => {
      logger.error('Error deregistering from service registry', {
        service: 'freezone-service',
        error: error.message
      });
      process.exit(1);
    });
}