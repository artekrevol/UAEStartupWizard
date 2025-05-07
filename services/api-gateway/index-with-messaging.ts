import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import routes from './routes';
import { serviceRegistry } from './middleware/serviceRegistry-with-communication';
import { requestLogger } from './middleware/proxy';
import { globalRateLimiter } from './middleware/rateLimiter';
import { initializeMessaging, registerGatewayServices, shutdownMessaging } from './messaging';

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

// Setup periodic cleanup of inactive services
setInterval(() => serviceRegistry.cleanupInactiveServices(), 5 * 60 * 1000); // Run every 5 minutes

// Start the server
const startServer = async () => {
  try {
    // Initialize messaging system
    initializeMessaging(serviceRegistry);
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`[API Gateway] Server running on port ${PORT}`);
      
      // Announce API Gateway is ready
      registerGatewayServices();
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
  shutdownMessaging();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[API Gateway] SIGINT received, shutting down gracefully');
  shutdownMessaging();
  process.exit(0);
});

export { app };