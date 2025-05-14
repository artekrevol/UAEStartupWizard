#!/bin/bash
# Script for Replit deployment without Playwright dependencies

echo "================================================="
echo "  UAE Business Setup Assistant - No-Playwright Deployment"
echo "================================================="
echo ""
echo "Creating Playwright-free deployment environment..."

# Set critical environment variables
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true
export NODE_ENV=production

# Create necessary directories
mkdir -p dist

# Build frontend assets
echo "📦 Building frontend..."
npx vite build

# Build backend without Playwright
echo "📦 Building backend (no Playwright)..."
npx esbuild server/index-http-only.js --platform=node --packages=external --bundle --format=esm --outdir=dist

# Create .npmrc to prevent Playwright installation
echo "playwright_skip_browser_download=1" > .npmrc
echo "playwright_browser_path=0" >> .npmrc

# Create special startup file for Replit
cat > dist/replit-start.js << 'EOF'
/**
 * Replit Deployment Startup Script
 * No Playwright dependencies, HTTP-only mode
 */

// Force environment settings
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.NODE_ENV = 'production';

// Import the actual server (will be compiled by esbuild)
import('./index-http-only.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
EOF

# Create special entrypoint for deployment
echo "node dist/replit-start.js" > run.sh
chmod +x run.sh

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Playwright-free deployment build complete!"
  echo ""
  echo "To deploy:"
  echo "1. Click the Deploy button in Replit"
  echo "2. Select start command: bash run.sh"
  echo ""
  echo "This build runs without any Playwright browser dependencies."
else
  echo "❌ Build failed. Please check the error messages above."
  exit 1
fi