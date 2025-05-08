#!/bin/bash
# Build script for deployment that completely skips Playwright

echo "🚀 Starting deployment build..."

# Set environment variables to disable Playwright
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true
export NODE_ENV=production

# Create .npmrc file to ensure Playwright is never installed
echo "playwright_skip_browser_download=1" > .npmrc
echo "playwright_browser_path=0" >> .npmrc
echo "✅ Created .npmrc to disable Playwright installation"

# Create a production environment file
cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
SCRAPER_HTTP_ONLY_MODE=true
EOF
echo "✅ Created production environment file"

# Build frontend
echo "🏗️ Building frontend..."
npx vite build

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed"
  exit 1
fi

# Build backend without Playwright
echo "🏗️ Building backend (No Playwright)..."
npx esbuild server/production-no-playwright.js --platform=node --packages=external --bundle --format=esm --outdir=dist

if [ $? -ne 0 ]; then
  echo "❌ Backend build failed"
  exit 1
fi

# Make sure the deployment builds correctly
echo "✅ Build completed successfully"
echo ""
echo "🎉 To deploy your application:"
echo "1. Click the Deploy button in Replit"
echo "2. Your application will be deployed with Playwright disabled"