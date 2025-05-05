/**
 * User Service Entry Point
 * 
 * Initializes the User Service with Express and configures all middleware
 */
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from '../../shared/middleware/error-handler';
import { db } from './db';
import { eventBus } from '../../shared/event-bus';

// Initialize Express app
const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;

// Configure middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Mount API routes
app.use('/', routes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`User Service listening on port ${PORT}`);
  
  // Subscribe to relevant events
  setupEventSubscriptions();
});

/**
 * Setup event subscriptions for the User Service
 */
function setupEventSubscriptions() {
  // Handle user-related events from other services
  eventBus.subscribe('document:created', async (data) => {
    console.log('Received document:created event', data);
    // Process event if needed
  });
  
  eventBus.subscribe('freezone:business-setup-started', async (data) => {
    console.log('Received freezone:business-setup-started event', data);
    // Update user profile or activity logs
  });
}

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  console.log('Shutting down User Service gracefully...');
  
  // Close database connection
  await db.end();
  
  // Close event bus connections if needed
  // await eventBus.close();
  
  console.log('User Service shutdown complete');
  process.exit(0);
}
