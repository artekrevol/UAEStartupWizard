#!/bin/bash
# Pre-deployment script for the UAE Business Setup Assistant

echo "================================================="
echo "  UAE Business Setup Assistant - Pre-deployment"
echo "================================================="
echo ""
echo "Setting up environment for deployment..."

# Set environment variables
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true
export NODE_ENV=production

# Create necessary directories
mkdir -p dist

# Copy server/index-http-only.js to dist/production-http-only.js for deployment
echo "📦 Preparing deployment files..."
cp server/index-http-only.js dist/production-http-only.js

echo "✅ Pre-deployment setup complete!"