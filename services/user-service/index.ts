/**
 * User Service
 * 
 * Main entry point for the User Service microservice
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { config } from '../../shared/config';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import routes from './routes';
import { runMigration } from './migrations/initial';
import { createId } from '@paralleldrive/cuid2';
import { pool } from './db';

// Initialize express app
const app = express();
const PORT = config.userService.port;
const HOST = config.userService.host;

// Set up basic middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: config.isProduction 
    ? [/\.replit\.app$/, /\.repl\.co$/] 
    : '*',
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  const requestId = createId();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} [ID: ${requestId}]`);
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: config.userService.rateLimitWindow,
  max: config.userService.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

// Apply rate limiting to all routes
app.use(limiter);

// Register routes
app.use('/api', routes);

// Setup error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start the server
const startServer = async () => {
  try {
    // Run database migrations
    await runMigration();
    
    app.listen(PORT, HOST, () => {
      console.log(`[User Service] Server running at http://${HOST}:${PORT}/`);
      
      // Register service health check endpoint
      app.get('/health', (req, res) => {
        // Check DB connection
        pool.query('SELECT 1', (err) => {
          if (err) {
            return res.status(503).json({
              status: 'error',
              message: 'Database connection issue',
              service: 'user-service',
              timestamp: new Date().toISOString(),
            });
          }
          
          res.json({
            status: 'healthy',
            service: 'user-service',
            timestamp: new Date().toISOString(),
          });
        });
      });
      
      // Initial event listeners setup
      console.log('[User Service] Setting up event listeners...');
      
      // Send heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          // Send heartbeat to service registry
          // Note: In a production environment, this would use a service discovery mechanism
          console.log('[User Service] Heartbeat sent');
        } catch (error) {
          console.error('[User Service] Failed to send heartbeat:', error);
        }
      }, config.serviceRegistry.heartbeatIntervalMs);
      
      // Cleanup on shutdown
      process.on('SIGINT', () => {
        console.log('[User Service] Shutting down...');
        clearInterval(heartbeatInterval);
        pool.end(() => {
          console.log('[User Service] Database connections closed');
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error('[User Service] Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is executed directly
if (require.main === module) {
  startServer();
}

export { app, startServer };