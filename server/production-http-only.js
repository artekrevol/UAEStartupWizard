/**
 * Production Server Entry Point (HTTP-only)
 * 
 * This file is the entry point for production deployment
 * with all browser-based scrapers completely disabled.
 */

// Force environment variables before any imports
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.NODE_ENV = 'production';

// Disable scraper initialization with browser
const originalImport = (modulePath) => {
  // If trying to import Playwright, return a mock
  if (modulePath.includes('playwright')) {
    return { chromium: { launch: () => ({ close: () => {} }) } };
  }
  
  // Normal import for other modules
  return import(modulePath);
};

// Import the main server with modifications
import express from "express";
import { registerRoutes } from "./routes.js";
import { serveStatic, log } from "./vite.js";
import { apiRateLimiter } from "./middleware/rate-limiter.js";
import helmet from "helmet";

// Create customized initializeScraper that doesn't use Playwright
const initializeScraper = (options = {}) => {
  log("Starting HTTP-only scraper (no Playwright)", "scraper");
  
  // This version only supports HTTP requests via axios
  options.httpOnly = true;
  
  // Schedule basic HTTP scraping tasks but no browser automation
  log("Configured for HTTP-only operation - browser features disabled", "scraper");
};

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

// Apply API rate limiting to all API endpoints
app.use('/api', apiRateLimiter);

// Increase payload size limit for API requests
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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize the scraper in HTTP-only mode
  log("Starting scraper in HTTP-only mode (no browser automation)");
  initializeScraper({ httpOnly: true });
  
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

  // Always use static assets in production
  serveStatic(app);

  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

console.log('Production server started with HTTP-only mode enabled');