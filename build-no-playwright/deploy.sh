#!/bin/bash
# Deployment script

export NODE_ENV=production
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true

echo "🏗️ Building for deployment..."
npm run build

echo "✅ Build complete. Ready for deployment!"
