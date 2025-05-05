/**
 * API Gateway - Central entry point for the microservices architecture
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { errorHandlerMiddleware } from '../../shared/errors';

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false
});
app.use(apiLimiter);

// Import authentication middleware
import { authenticateJWT } from './middleware/auth';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      gateway: 'online'
      // Other service statuses would be fetched dynamically
    }
  });
});

// Apply authentication to all API routes
app.use('/api', authenticateJWT);

// Service routing configuration
const serviceRoutes = [
  {
    path: '/api/auth',
    target: 'http://user-service:3001',
    pathRewrite: { '^/api/auth': '/' }
  },
  {
    path: '/api/users',
    target: 'http://user-service:3001',
    pathRewrite: { '^/api/users': '/users' }
  },
  {
    path: '/api/documents',
    target: 'http://document-service:3002',
    pathRewrite: { '^/api/documents': '/' }
  },
  {
    path: '/api/freezone',
    target: 'http://freezone-service:3003',
    pathRewrite: { '^/api/freezone': '/' }
  },
  {
    path: '/api/research',
    target: 'http://ai-research-service:3004',
    pathRewrite: { '^/api/research': '/' }
  },
  {
    path: '/api/scraper',
    target: 'http://scraper-service:3005',
    pathRewrite: { '^/api/scraper': '/' }
  }
];

// Set up proxy middleware for each service
serviceRoutes.forEach(route => {
  app.use(
    route.path,
    createProxyMiddleware({
      target: route.target,
      changeOrigin: true,
      pathRewrite: route.pathRewrite,
      // Add request logging
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[API Gateway] Proxying request to ${route.target}${req.url}`);
      },
      // Handle service errors
      onError: (err, req, res) => {
        console.error(`[API Gateway] Proxy error: ${err.message}`);
        res.status(503).json({
          code: 'SERVICE_UNAVAILABLE',
          message: `The ${route.path} service is currently unavailable`
        });
      }
    })
  );
});

// Global error handler
app.use(errorHandlerMiddleware);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`[API Gateway] Server running on port ${PORT}`);
});
