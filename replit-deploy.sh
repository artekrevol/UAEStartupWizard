#!/bin/bash
# Replit-specific deployment script

echo "================================================="
echo "  UAE Business Setup Assistant - Replit Deploy"
echo "================================================="
echo ""
echo "Creating a Replit-compatible deployment build..."
echo ""

# Set environment variables
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true
export NODE_ENV=production

# Create necessary files
echo "playwright_skip_browser_download=1" > .npmrc
echo "playwright_browser_path=0" >> .npmrc

# Create screenshots directory (required)
mkdir -p screenshots

# Build frontend
echo "🏗️ Building frontend..."
npx vite build

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed"
  exit 1
fi

# Create dist/public directory structure (required by Replit)
mkdir -p dist/public
cp -r dist/assets dist/public/
cp dist/index.html dist/public/

echo "✅ Frontend build completed and assets placed in dist/public"

# Build backend without using Playwright
echo "🏗️ Building backend (HTTP-only mode)..."

# Create a simple HTTP-only server 
cat > server/replit-http-only.js << EOF
/**
 * Replit HTTP-Only Server
 * No Playwright dependencies
 */

// Force environment variables
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.NODE_ENV = 'production';

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';
import { db } from './db.js';
import axios from 'axios';
import { routes } from './routes.js';

// Create Express app
const app = express();
const server = createServer(app);

// Essential middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add routes
routes.forEach(route => {
  app[route.method](route.path, route.handler);
});

// Serve static files 
app.use(express.static(path.join(process.cwd(), 'dist/public')));

// Handle all routes for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist/public/index.html'));
});

// Basic HTTP scraper (no Playwright)
const basicHttpScrape = async (url) => {
  try {
    console.log(\`Scraping \${url} using HTTP-only method\`);
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(\`Error scraping \${url}: \${error.message}\`);
    return null;
  }
};

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running in \${process.env.NODE_ENV} mode on port \${PORT}\`);
  console.log('Using HTTP-only mode for all data operations (no Playwright)');
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down gracefully');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});
EOF

# Build the HTTP-only server
npx esbuild server/replit-http-only.js --platform=node --packages=external --bundle --format=esm --outdir=dist

if [ $? -ne 0 ]; then
  echo "❌ Backend build failed"
  exit 1
fi

# Rename the output file to index.js (expected by Replit)
mv dist/replit-http-only.js dist/index.js

echo "✅ Backend build completed (HTTP-only mode)"

# Create a Replit-specific package.json in dist folder
cat > dist/package.json << EOF
{
  "name": "uae-business-setup-assistant",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "express": "*",
    "cors": "*",
    "compression": "*",
    "axios": "*",
    "pg": "*"
  }
}
EOF

echo "✅ Created Replit-compatible package.json"

# Create the screenshots directory in the dist folder
mkdir -p dist/screenshots
echo "This directory is required for the application to work properly." > dist/screenshots/README.txt

echo "✅ Created required screenshots directory"

echo ""
echo "✅ Deployment build complete!"
echo ""
echo "To deploy:"
echo "1. Click the 'Deploy' button in Replit"
echo "2. This build has been specifically configured for Replit deployment"
echo "   with all Playwright dependencies removed and the required directory structure."
echo ""