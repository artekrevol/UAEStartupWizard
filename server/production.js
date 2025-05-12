/**
 * Production Server Entry Point
 * 
 * This file is used for production deployment on Railway
 * It maintains all functionality while being optimized for production
 */

// Import dependencies
import express from 'express';
import { registerRoutes } from './routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import helmet from 'helmet';
import { createServer } from 'http';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set environment variables
process.env.NODE_ENV = 'production';

// Create Express app and HTTP server
const app = express();
const server = createServer(app);

// ADD HEALTH CHECK ENDPOINTS FIRST - before any middleware
// This ensures they're always accessible even if other middleware fails
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple root route for quick testing
app.get('/', (req, res) => {
  res.status(200).send('Server is running. Use /healthz for health checks.');
});

// Apply security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "https://api.openai.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Enable compression for all responses
app.use(compression());

// Increase payload size limit
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

// Add logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).substring(0, 80)}`;
        if (JSON.stringify(capturedJsonResponse).length > 80) {
          logLine += "...";
        }
      }
      console.log(logLine);
    }
  });

  next();
});

// Health check endpoints are defined at the top of the file to ensure
// they are always accessible, even if other middleware or route handlers fail

// Register all API routes
await registerRoutes(app, server);

// Serve static files for production
app.use(express.static(path.join(__dirname, '../client')));

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start the server
const port = process.env.PORT || 5000;

// Log environment variables for debugging (without exposing sensitive information)
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Railway Environment: ${process.env.RAILWAY_ENVIRONMENT === 'true' ? 'Yes' : 'No'}`);
console.log(`Using port: ${port}`);

// Start server with additional error handling
try {
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    console.log(`Production server running on port ${port}`);
    console.log(`Health endpoint available at: http://localhost:${port}/health`);
    console.log(`Alternative health endpoint available at: http://localhost:${port}/healthz`);
  });
  
  // Handle server errors
  server.on('error', (err) => {
    console.error('Server error occurred:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Try using a different port.`);
    }
  });
} catch (err) {
  console.error('Failed to start server:', err);
}