
#!/bin/bash

echo "Configuring for HTTP-only mode..."

# Set environment variables to skip Playwright browser installation
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true
export NODE_ENV=production

# Create .npmrc file to ensure Playwright is never installed
echo "playwright_skip_browser_download=1" > .npmrc
echo "playwright_browser_path=0" >> .npmrc

# Create screenshots directory
mkdir -p screenshots

# Create production HTTP-only entry point if it doesn't exist
mkdir -p dist
cat > dist/production-http-only.js << EOF
/**
 * Production Server Entry Point (HTTP-only)
 * 
 * This file is the entry point for production deployment
 * with all browser-based scrapers disabled.
 */

// Force environment variables before any imports
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.NODE_ENV = 'production';

// Import the main server with HTTP-only configuration
import './index.js';

console.log('Production server started with HTTP-only scraper mode enabled');
EOF

echo -e "\n✅ Pre-deployment configuration complete"
