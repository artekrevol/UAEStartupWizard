import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import { checkConnection } from './db';
import routes from './routes';
import { eventBus } from '../../shared/event-bus';

// Initialize Express app
const app = express();
const PORT = process.env.FREEZONE_SERVICE_PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'freezone-service' });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Handle events from other services
const setupEventHandlers = () => {
  // Listen for document events
  eventBus.subscribe('document-uploaded', async (data) => {
    console.log(`Document uploaded event received: ${JSON.stringify(data)}`);
    // Handle document upload event if related to free zones
  });

  // Handle AI research events
  eventBus.subscribe('research-complete', async (data) => {
    console.log(`Research complete event received: ${JSON.stringify(data)}`);
    // Update free zone data based on research results
  });

  // Additional event handlers would be added here
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
      console.log(`[FreezoneService] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[FreezoneService] Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[FreezoneService] SIGTERM received, shutting down gracefully');
  eventBus.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[FreezoneService] SIGINT received, shutting down gracefully');
  eventBus.shutdown();
  process.exit(0);
});

export { app };