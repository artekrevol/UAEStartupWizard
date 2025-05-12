#!/bin/bash

# Enhanced rebuild script with HTTP-only option

# Set environment variables
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true
export USE_HTTP_ONLY_SCRAPER=true
export NODE_ENV=production

echo "=== Building HTTP-only version ==="
echo "Environment variables set:"
echo "- PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1"
echo "- SCRAPER_HTTP_ONLY_MODE=true"
echo "- USE_HTTP_ONLY_SCRAPER=true"
echo "- NODE_ENV=production"

# Run build
echo "Building frontend and backend..."
npm run build-no-playwright

# Fix imports
echo "Fixing imports..."
node fix-cheerio-import.js

echo "=== Build completed ==="
echo "HTTP-only version is ready for deployment"
echo ""
echo "To deploy to Railway, run:"
echo "  railway up"
echo ""
echo "To view and set variables on Railway, run:"
echo "  railway variables"
echo ""
echo "Make sure to set these variables on Railway:"
echo "  JWT_SECRET"
echo "  DATABASE_URL"
echo "  OPENAI_API_KEY (optional)"
echo "  SCRAPER_HTTP_ONLY_MODE=true"
echo "  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1"
echo "  NODE_ENV=production"