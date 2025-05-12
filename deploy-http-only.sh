#!/bin/bash
# Script to build and deploy with HTTP-only scraper (no Playwright)

echo "================================================="
echo "  UAE Business Setup Assistant - HTTP-Only Deploy"
echo "================================================="
echo ""
echo "This script builds a deployment version without Playwright"
echo "using the HTTP-only scraper implementation."
echo ""

# Set environment variables
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true
export NODE_ENV=production

# Build the frontend
echo "📦 Building frontend..."
npx vite build

# Build the HTTP-only server
echo "📦 Building HTTP-only server..."
npx esbuild server/index-http-only.js --platform=node --packages=external --bundle --format=esm --outdir=dist

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ HTTP-only deployment build complete!"
  echo ""
  echo "To start the production server:"
  echo "NODE_ENV=production node dist/index-http-only.js"
  echo ""
  echo "Click the Deploy button in Replit to deploy this application."
else
  echo "❌ Build failed. Please check the error messages above."
  exit 1
fi