import express from 'express';
import cors from 'cors';
import { json, urlencoded } from 'body-parser';
import compression from 'compression';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import routes from './routes';
import { initServiceRegistry, cleanupInactiveServices, serviceRegistry } from './middleware/serviceRegistry';
import { registerService, deregisterService } from './routes/health';
import { requestLogger } from './middleware/proxy';
import { globalRateLimiter } from './middleware/rateLimiter';
import { initializeMessaging, registerGatewayServices, shutdownMessaging } from './messaging';
import { eventBus } from '../../shared/event-bus';
import { applySecurity, preventOpenRedirect } from '../../shared/middleware/security';
import { setCacheHeaders } from '../../shared/middleware/cache-middleware';

// Initialize Express app
const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Apply compression middleware
app.use(compression({
  // Compression filter: don't compress responses with Content-Type 'image/*' or 'video/*'
  filter: (req, res) => {
    const contentType = res.getHeader('Content-Type') as string || '';
    if (contentType.match(/image\/.*|video\/.*/)) {
      return false;
    }
    // Use default compression filter for everything else
    return compression.filter(req, res);
  },
  // Compression level (0-9, where 0 = no compression, 9 = max compression)
  level: 6
}));

// Apply comprehensive security middleware
applySecurity(app);

// Add open redirect protection for specific domains
app.use(preventOpenRedirect([
  'uae-business-setup.com',
  'api.uae-business-setup.com',
  'admin.uae-business-setup.com'
]));

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

// Add cache control headers for static assets and GET requests
app.use((req, res, next) => {
  const path = req.path;
  
  // Cache static assets aggressively
  if (path.match(/\.(css|js|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/)) {
    // Long-term caching for static assets (7 days)
    return setCacheHeaders(7 * 24 * 60 * 60)(req, res, next);
  }
  
  // Cache API GET requests that don't need to be fresh
  if (req.method === 'GET') {
    // Different caching strategies based on endpoint
    if (path.match(/\/api\/(free-zones|industry-groups|activities)/)) {
      // Medium-term caching for reference data (1 hour)
      return setCacheHeaders(60 * 60, { mustRevalidate: true })(req, res, next);
    }
    
    if (path.match(/\/api\/documents/)) {
      // Short-term caching for documents (5 minutes)
      return setCacheHeaders(5 * 60, { private: true })(req, res, next);
    }
  }
  
  // Don't cache other requests
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  next();
});

// API Routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Initialize service registry
initServiceRegistry();

// Setup periodic cleanup of inactive services
setInterval(cleanupInactiveServices, 5 * 60 * 1000); // Run every 5 minutes

// Set up event listeners
const setupEventHandlers = () => {
  // Listen for service registration events
  eventBus.subscribe('service-registered', (data) => {
    console.log(`[API Gateway] Service registered: ${JSON.stringify(data)}`);
    registerService(data.name, data.host, data.port, data.healthEndpoint);
  });

  // Listen for service deregistration events
  eventBus.subscribe('service-deregistered', (data) => {
    console.log(`[API Gateway] Service deregistered: ${JSON.stringify(data)}`);
    deregisterService(data.name);
  });

  // Listen for service health change events
  eventBus.subscribe('service-health-changed', (data) => {
    console.log(`[API Gateway] Service health changed: ${JSON.stringify(data)}`);
  });
  
  // Listen for API Gateway health check events
  eventBus.subscribe('health-check', (data) => {
    console.log(`[API Gateway] Health check received at ${new Date().toISOString()}`);
    
    // Publish health status back
    eventBus.publish('health-status', {
      service: 'api-gateway',
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
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