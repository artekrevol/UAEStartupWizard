import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeScraper } from "./scraper";
import path from "path";
import fs from "fs";
import { exec } from "child_process";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

  // Initialize the MOEC data scraper
  initializeScraper();
  
  // Create screenshots directory for Playwright if it doesn't exist
  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
    log(`Created screenshots directory at ${screenshotsDir}`);
  }

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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