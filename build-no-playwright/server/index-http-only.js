/**
 * HTTP-Only Server Entry Point for Deployment
 * 
 * This is a modified version of the server that uses HTTP-only scraping
 * without any Playwright dependencies for production deployment.
 */

import express from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";
import compression from "compression";
import helmet from "helmet";
import { apiRateLimiter } from "./middleware/rate-limiter.js";

// Force HTTP-only mode
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.NODE_ENV = 'production';

const app = express();

// Apply Helmet for security headers
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

// Enable compression
app.use(compression());

// Apply API rate limiting to all API endpoints
app.use('/api', apiRateLimiter);

// Increase payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Serve static files
app.use(express.static(path.join(process.cwd(), 'dist/public')));

// Register API routes
const httpServer = registerRoutes(app);

// Improved error handling middleware
app.use((err, _req, res, _next) => {
  console.error('Application error:', err);
  
  const status = err.status || err.statusCode || 500;
  const isProd = app.get('env') === 'production';
  let message = isProd ? 'An unexpected error occurred' : (err.message || 'Internal Server Error');
  
  res.status(status).json({ 
    message,
    error: isProd ? undefined : err.name,
    requestId: _req.headers['x-request-id'] || undefined
  });
  
  if (!isProd) {
    throw err;
  }
});

// Fall back to index.html for SPA client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
});

// Start the server
const port = process.env.PORT || 3000;
httpServer.listen({
  port,
  host: "0.0.0.0", // Important: Must bind to all network interfaces for Replit
}, () => {
  console.log(`Production server running on port ${port} (0.0.0.0)`);
  console.log(`For Replit deployments, this will be accessible via the external port 80`);
});