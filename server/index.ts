import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeScraper } from "./scraper";

// Force HTTP-only mode in production
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
import { apiRateLimiter } from "./middleware/rate-limiter";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import helmet from "helmet";

const app = express();

// Apply Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for development
      connectSrc: ["'self'", "https://api.openai.com"],
      imgSrc: ["'self'", "data:", "https://*"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Apply API rate limiting to all API endpoints
app.use('/api', apiRateLimiter);

// Increase payload size limit to 100MB for handling large audit results
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

// Add logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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

  // Initialize the MOEC data scraper - only start in HTTP-only mode for production
  if (app.get("env") === "production") {
    log("Starting scraper in HTTP-only mode");
    initializeScraper({ httpOnly: true });
  } else {
    initializeScraper();
  }
  
  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  log(`Using screenshots directory at ${screenshotsDir}`);

  // Import the scraper scheduler on application start
  try {
    // Schedule the scrapers to run monthly if in production
    if (app.get("env") === "production") {
      log("Setting up monthly scraper schedule for production environment");
      
      // Execute the scraper index.js with the --schedule flag
      exec('node scraper/index.js --schedule', (error, stdout, stderr) => {
        if (error) {
          log(`Error setting up scraper schedule: ${error.message}`);
          return;
        }
        if (stderr) {
          log(`Scraper schedule stderr: ${stderr}`);
          return;
        }
        log(`Scraper schedule stdout: ${stdout}`);
      });
    } else {
      // In development, don't schedule but log that it's available
      log("Scraper scheduler available but not running automatically in development");
      log("Run 'node scraper/index.js --schedule' manually to schedule or 'node scraper/index.js' to run immediately");
    }
  } catch (error: any) {
    log(`Error setting up scraper scheduler: ${error.message}`);
  }

  // Improved error handling middleware to prevent exposing sensitive information
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Log the full error for debugging purposes
    console.error('Application error:', err);
    
    const status = err.status || err.statusCode || 500;
    
    // Don't send internal error details to the client in production
    const isProd = app.get('env') === 'production';
    
    // Sanitize error messages in production
    let message = isProd ? 'An unexpected error occurred' : (err.message || 'Internal Server Error');
    
    // Handle specific error types with appropriate messages
    if (err.code === '42703') { // PostgreSQL column does not exist
      message = isProd ? 'Database query error' : 'Invalid database column referenced';
    } else if (err.code && err.code.startsWith('23')) { // PostgreSQL constraint violations
      message = isProd ? 'Data validation error' : 'Database constraint violation';
    } else if (err.type === 'entity.too.large') {
      message = 'Request entity too large';
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
      message = 'Service timeout, please try again';
    }
    
    // Send a sanitized response
    res.status(status).json({ 
      message,
      error: isProd ? undefined : err.name, 
      // Include a request ID for tracking in logs, if available
      requestId: _req.headers['x-request-id'] || undefined
    });
    
    // Don't throw the error in production - just log it
    if (!isProd) {
      throw err; // Re-throw for development environment only
    }
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();