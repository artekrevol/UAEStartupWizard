/**
 * Build script for deployment with HTTP-only scraper
 * 
 * This script builds a version of the application that:
 * 1. Completely removes all Playwright dependencies
 * 2. Uses HTTP-only scraper implementation
 * 3. Creates a deployment-ready package
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Banner display
console.log('=================================================');
console.log('  UAE Business Setup Assistant - Deployment Build  ');
console.log('=================================================');
console.log('');
console.log('Building a version without Playwright dependencies...');
console.log('');

// Step 1: Set up environment variables
process.env.NODE_ENV = 'production';
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';

// Step 2: Create a clean build directory
const buildDir = path.resolve('build-deployment');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Step 3: Create the package.json without Playwright
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Remove Playwright from dependencies and devDependencies
const filteredDependencies = Object.fromEntries(
  Object.entries(packageJson.dependencies || {})
    .filter(([key]) => !key.includes('playwright'))
);

const filteredDevDependencies = Object.fromEntries(
  Object.entries(packageJson.devDependencies || {})
    .filter(([key]) => !key.includes('playwright'))
);

// Create a new package.json without Playwright
const deploymentPackageJson = {
  ...packageJson,
  dependencies: filteredDependencies,
  devDependencies: filteredDevDependencies,
  scripts: {
    ...packageJson.scripts,
    build: 'vite build && esbuild server/index-http-only.js --platform=node --packages=external --bundle --format=esm --outdir=dist',
    start: 'NODE_ENV=production node dist/index-http-only.js'
  }
};

// Write the deployment package.json
fs.writeFileSync(
  path.join(buildDir, 'package.json'),
  JSON.stringify(deploymentPackageJson, null, 2)
);
console.log('✅ Created Playwright-free package.json');

// Step 4: Create a HTTP-only server entry point
const serverEntryContent = `/**
 * HTTP-Only Server Entry Point
 * 
 * This is a modified version of the server that uses HTTP-only scraping
 * without any Playwright dependencies.
 */

import express from "express";
import { registerRoutes } from "./routes.js";
import { serveStatic, log } from "./vite.js";
import { apiRateLimiter } from "./middleware/rate-limiter.js";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { HttpOnlyScraper } from "./utils/http_only_scraper.js";

// Force HTTP-only mode
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';

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
      let logLine = \`\${req.method} \${path} \${res.statusCode} in \${duration}ms\`;
      if (capturedJsonResponse) {
        logLine += \` :: \${JSON.stringify(capturedJsonResponse)}\`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize the HTTP-only scraper - a replacement for Playwright-based scraping
function initializeHttpOnlyScraper() {
  log("Starting HTTP-only scraper (no browser dependencies)", "scraper");
  
  const scraper = new HttpOnlyScraper({
    logger: {
      log: (message) => log(message, "scraper")
    }
  });
  
  // Basic implementation that schedules HTTP-only scraping
  // This replaces the browser-based scraping in the original code
  
  // Schedule minimal data update for production
  if (app.get("env") === "production") {
    log("Setting up monthly HTTP-only data updates", "scraper");
    
    // Simple scheduled task instead of the full scraper
    const basicHttpScraping = () => {
      log("Running scheduled HTTP-only data update", "scraper");
      
      // Basic free zone info update using HTTP-only scraper
      scraper.fetchPage("https://www.moec.gov.ae/en/free-zones")
        .then(html => {
          if (html) {
            log("Successfully fetched free zone data", "scraper");
          }
        })
        .catch(error => {
          log(\`Error in scheduled update: \${error.message}\`, "scraper");
        });
    };
    
    // Run once at startup
    setTimeout(basicHttpScraping, 10000);
    
    // Set up monthly schedule
    setInterval(basicHttpScraping, 30 * 24 * 60 * 60 * 1000);
  }
  
  return scraper;
}

(async () => {
  const server = await registerRoutes(app);

  // Initialize the HTTP-only scraper
  log("Initializing HTTP-only scraper for production");
  initializeHttpOnlyScraper();
  
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

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(\`serving on port \${port}\`);
  });
})();
`;

// Create the HTTP-only server file
fs.mkdirSync(path.join(buildDir, 'server'), { recursive: true });
fs.writeFileSync(
  path.join(buildDir, 'server', 'index-http-only.js'),
  serverEntryContent
);
console.log('✅ Created HTTP-only server entry point');

// Step 5: Copy the scraper utility
fs.mkdirSync(path.join(buildDir, 'server', 'utils'), { recursive: true });
fs.copyFileSync(
  'scraper/utils/http_only_scraper.js',
  path.join(buildDir, 'server', 'utils', 'http_only_scraper.js')
);
console.log('✅ Copied HTTP-only scraper utility');

// Step 6: Copy required project files (excluding Playwright)
const copyDirectories = [
  'client',
  'public',
  'shared',
];

copyDirectories.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join(buildDir, dir), { recursive: true });
  }
});

// Copy individual files
const filesToCopy = [
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'index.html',
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(buildDir, file));
  }
});

console.log('✅ Copied project files (excluding Playwright)');

// Step 7: Copy the server directory (carefully to avoid Playwright)
function copyServerFiles(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    
    // Skip Playwright related files
    if (entry.name.includes('playwright') || entry.name === 'node_modules') {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyServerFiles(srcPath, destPath);
    } else {
      const content = fs.readFileSync(srcPath, 'utf8');
      
      // Skip files that import or use Playwright
      if (content.includes('playwright')) {
        continue;
      }
      
      fs.writeFileSync(destPath, content);
    }
  }
}

// Copy server files excluding Playwright
if (fs.existsSync('server')) {
  copyServerFiles('server', path.join(buildDir, 'server'));
}

console.log('✅ Copied server files (excluding Playwright references)');

// Step 8: Create the .npmrc file
fs.writeFileSync(
  path.join(buildDir, '.npmrc'),
  'playwright_skip_browser_download=1\nplaywright_browser_path=0\n'
);
console.log('✅ Created .npmrc file');

// Step 9: Create a production environment file
fs.writeFileSync(
  path.join(buildDir, '.env.production'),
  `NODE_ENV=production
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
SCRAPER_HTTP_ONLY_MODE=true
`
);
console.log('✅ Created production environment file');

// Step 10: Create a deployment script
fs.writeFileSync(
  path.join(buildDir, 'deploy.sh'),
  `#!/bin/bash
# Deployment script

export NODE_ENV=production
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true

echo "🏗️ Building for deployment..."
npm run build

echo "✅ Build complete. Ready for deployment!"
`
);
fs.chmodSync(path.join(buildDir, 'deploy.sh'), 0o755);
console.log('✅ Created deployment script');

// Final message
console.log('');
console.log('✅ Build completed successfully!');
console.log('');
console.log('Your Playwright-free deployment build is ready in the build-deployment directory.');
console.log('');
console.log('To deploy:');
console.log('1. cd build-deployment');
console.log('2. Use the Deploy button in Replit');
console.log('');
console.log('This build completely removes Playwright dependencies and replaces them');
console.log('with an HTTP-only scraper implementation.');