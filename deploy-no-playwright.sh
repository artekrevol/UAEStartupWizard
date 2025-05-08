#!/bin/bash
# Complete Playwright-free deployment script

echo "================================================="
echo "  UAE Business Setup Assistant - Replit Deploy"
echo "================================================="
echo ""
echo "This script creates a Playwright-free build for deployment on Replit"
echo ""

# Set environment variables
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true
export NODE_ENV=production

# Create necessary files
echo "playwright_skip_browser_download=1" > .npmrc
echo "playwright_browser_path=0" >> .npmrc

# Create production environment file
cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
SCRAPER_HTTP_ONLY_MODE=true
EOF

# Build frontend
echo "🏗️ Building frontend..."
npx vite build

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed"
  exit 1
fi

# Build backend using the HTTP-only version
echo "🏗️ Building backend (HTTP-only mode)..."
npx esbuild server/production-http-only.js --platform=node --packages=external --bundle --format=esm --outdir=dist

if [ $? -ne 0 ]; then
  echo "❌ Backend build failed"
  exit 1
fi

# Create a deployment-ready package.json
echo "📝 Creating deployment-ready package.json..."
cat > dist/package.json << EOF
{
  "name": "uae-business-setup-assistant",
  "version": "1.0.0",
  "type": "module",
  "main": "production-http-only.js",
  "scripts": {
    "start": "node production-http-only.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@hookform/resolvers": "*",
    "@neondatabase/serverless": "*",
    "@paralleldrive/cuid2": "*",
    "@radix-ui/react-accordion": "*",
    "@radix-ui/react-alert-dialog": "*",
    "@radix-ui/react-avatar": "*",
    "@radix-ui/react-checkbox": "*",
    "@radix-ui/react-dialog": "*",
    "@radix-ui/react-dropdown-menu": "*",
    "@radix-ui/react-label": "*",
    "@radix-ui/react-navigation-menu": "*",
    "@radix-ui/react-popover": "*",
    "@radix-ui/react-select": "*",
    "@radix-ui/react-separator": "*",
    "@radix-ui/react-slot": "*",
    "@radix-ui/react-tabs": "*",
    "@radix-ui/react-toast": "*",
    "@tanstack/react-query": "*",
    "axios": "*",
    "bcrypt": "*",
    "cheerio": "*",
    "class-variance-authority": "*",
    "clsx": "*",
    "compression": "*",
    "connect-pg-simple": "*",
    "cookie-parser": "*",
    "cors": "*",
    "date-fns": "*",
    "dotenv": "*",
    "drizzle-orm": "*",
    "drizzle-zod": "*",
    "express": "*",
    "express-rate-limit": "*",
    "express-session": "*",
    "helmet": "*",
    "jsonwebtoken": "*",
    "lucide-react": "*",
    "memory-cache": "*",
    "memorystore": "*",
    "multer": "*",
    "node-cron": "*",
    "openai": "*",
    "pg": "*",
    "react": "*",
    "react-dom": "*",
    "react-hook-form": "*",
    "wouter": "*",
    "zod": "*"
  }
}
EOF

echo "✅ Build completed successfully"
echo ""
echo "To deploy your application:"
echo "1. Click the 'Deploy' button in Replit"
echo "2. Your application will be deployed without Playwright dependencies"