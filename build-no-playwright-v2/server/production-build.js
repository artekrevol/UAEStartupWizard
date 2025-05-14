/**
 * Production Build Script
 * 
 * This script builds the server for production with Playwright dependencies removed
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';

console.log('🏗️ Building server for production (HTTP-only mode)...');

// Create server entry point
const serverContent = `/**
 * Production Server Entry Point
 */

// Force environment variables before anything else
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.NODE_ENV = 'production';

import express from 'express';
import compression from 'compression';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import { fileURLToPath } from 'url';

// Convert ESM URL to file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Security middleware
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

// Parse JSON body
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false, limit: '100mb' }));

// Serve static files
const clientDistPath = path.join(__dirname, '../client');
app.use(express.static(clientDistPath));

// Add a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', mode: 'http-only' });
});

// Add basic API endpoints
app.get('/api/info', (req, res) => {
  res.json({
    version: '1.0.0',
    mode: 'http-only',
    environment: process.env.NODE_ENV
  });
});

// Simple logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start the server
const port = process.env.PORT || 5000;
server.listen({
  port,
  host: "0.0.0.0",
}, () => {
  console.log(`Production server running on port ${port} (HTTP-only mode)`);
});
`;

// Write server.js to dist directory
fs.writeFileSync('dist/server.js', serverContent);
console.log('✅ Created production server entry point');

// Create .npmrc file to prevent Playwright installation
fs.writeFileSync('.npmrc', 'playwright_skip_browser_download=1\nplaywright_browser_path=0\n');
console.log('✅ Created .npmrc file to prevent Playwright installation');

console.log('✅ Server build completed successfully');
