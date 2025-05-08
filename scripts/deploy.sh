#!/bin/bash
# Custom deployment script to fix deployment issues

echo "🚀 Starting deployment process..."

# 1. Set environment variables for deployment
export SCRAPER_HTTP_ONLY_MODE=true
export USE_MEMORY_CACHE=true
export NODE_ENV=production

# 2. Run pre-deployment setup
echo "🔧 Running pre-deployment setup..."
node scripts/pre-deploy.js

# 3. Create environment file to ensure environment variables are available during build
echo "📝 Creating production environment file..."
cat > .env.production << EOL
# Production Environment Variables
SCRAPER_HTTP_ONLY_MODE=true
USE_MEMORY_CACHE=true
NODE_ENV=production
EOL

# 4. Fix TypeScript compatibility issues
echo "🔧 Applying TypeScript compatibility fixes..."
cp shared/middleware/performance-fixed.ts shared/middleware/performance.ts

# 4. Skip Playwright installation
echo "⚙️ Setting npm config to skip optional dependencies..."
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# 5. Build frontend
echo "🏗️ Building frontend..."
node client/build-production.js || { echo "Frontend build failed"; exit 1; }

# 6. Build backend (without Playwright)
echo "🏗️ Building backend..."
npx esbuild server/production.js --platform=node --packages=external --bundle --format=esm --outdir=dist || { echo "Backend build failed"; exit 1; }

echo "✅ Deployment build completed successfully!"
echo "You can now deploy your application."