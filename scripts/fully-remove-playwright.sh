#!/bin/bash
# This script completely removes Playwright from the project for deployment

echo "🔄 Creating a Playwright-free build for deployment..."

# Create a temporary directory for the build
BUILD_DIR="build-no-playwright"
mkdir -p $BUILD_DIR

# Copy only the necessary files
echo "📂 Copying project files (excluding Playwright)..."
cp -r client $BUILD_DIR/
cp -r server $BUILD_DIR/
cp -r shared $BUILD_DIR/
cp -r scripts $BUILD_DIR/
cp -r public $BUILD_DIR/

# Copy configuration files
cp vite.config.ts $BUILD_DIR/
cp tailwind.config.ts $BUILD_DIR/
cp postcss.config.js $BUILD_DIR/
cp tsconfig.json $BUILD_DIR/
cp index.html $BUILD_DIR/

# Create a modified package.json without Playwright
echo "📝 Creating Playwright-free package.json..."
cat > $BUILD_DIR/package.json << EOF
{
  "name": "uae-business-setup-assistant",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "vite build && esbuild server/production-no-playwright.js --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "cross-env NODE_ENV=production node dist/index.js"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.1",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@neondatabase/serverless": "^0.10.4",
    "@paralleldrive/cuid2": "^2.2.2",
    "@radix-ui/react-accordion": "^1.2.1",
    "@radix-ui/react-alert-dialog": "^1.1.2",
    "@radix-ui/react-aspect-ratio": "^1.1.0",
    "@radix-ui/react-avatar": "^1.1.1",
    "@radix-ui/react-checkbox": "^1.1.2",
    "@radix-ui/react-collapsible": "^1.1.1",
    "@radix-ui/react-context-menu": "^2.2.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-hover-card": "^1.1.2",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-menubar": "^1.1.2",
    "@radix-ui/react-navigation-menu": "^1.2.1",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.2.1",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.1",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.3",
    "@replit/vite-plugin-shadcn-theme-json": "^0.0.4",
    "@tanstack/react-query": "^5.60.5",
    "axios": "^1.8.4",
    "bcrypt": "^5.1.1",
    "cheerio": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "compression": "^1.8.0",
    "connect-pg-simple": "^10.0.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "cross-env": "^7.0.3",
    "date-fns": "^3.6.0",
    "dotenv": "^16.4.7",
    "drizzle-orm": "^0.39.3",
    "drizzle-zod": "^0.7.1",
    "embla-carousel-react": "^8.3.0",
    "express": "^4.21.2",
    "express-cache-controller": "^1.1.0",
    "express-rate-limit": "^7.5.0",
    "express-session": "^1.18.1",
    "framer-motion": "^11.13.1",
    "helmet": "^8.1.0",
    "input-otp": "^1.2.4",
    "ioredis": "^5.6.1",
    "jsonwebtoken": "^9.0.2",
    "lucide-react": "^0.453.0",
    "memory-cache": "^0.2.0",
    "memorystore": "^1.6.7",
    "multer": "^1.4.5-lts.2",
    "node-cron": "^3.0.3",
    "openai": "^4.96.0",
    "pg": "^8.15.6",
    "rate-limiter-flexible": "^7.1.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.1",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.4",
    "recharts": "^2.13.0",
    "tailwind-merge": "^2.5.4",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.0",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "zod": "^3.23.8",
    "zod-validation-error": "^3.4.1"
  },
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^0.0.2",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
    "@tailwindcss/typography": "^0.5.15",
    "@types/express": "4.17.21",
    "@types/node": "20.16.11",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.2",
    "autoprefixer": "^10.4.20",
    "drizzle-kit": "^0.30.4",
    "esbuild": "^0.25.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "5.6.3",
    "vite": "^5.4.14"
  }
}
EOF

# Create .npmrc file to prevent Playwright download
echo "playwright_skip_browser_download=1" > $BUILD_DIR/.npmrc
echo "playwright_browser_path=0" >> $BUILD_DIR/.npmrc

# Create production environment file
cat > $BUILD_DIR/.env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
SCRAPER_HTTP_ONLY_MODE=true
EOF

# Create a modified entry point that forces HTTP-only mode
echo "📝 Creating HTTP-only scraper configuration..."
cat > $BUILD_DIR/server/production-http-only.js << EOF
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

echo "✅ Playwright-free build prepared in $BUILD_DIR/"
echo ""
echo "🚀 To deploy:"
echo "1. cd $BUILD_DIR"
echo "2. Use the Deploy button in Replit"
echo ""
echo "If you need to return to the original project:"
echo "cd .."