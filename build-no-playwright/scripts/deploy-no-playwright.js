/**
 * Deployment Script - No Playwright Version
 * 
 * This script prepares the application for deployment by:
 * 1. Setting environment variables to disable Playwright
 * 2. Building the frontend
 * 3. Building the backend with Playwright disabled
 * 4. Creating a production-ready package.json
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting deployment preparation - No Playwright version');

// Set environment variables to skip Playwright
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.NODE_ENV = 'production';

// Create .npmrc file to ensure Playwright is never installed
fs.writeFileSync('.npmrc', 'playwright_skip_browser_download=1\nplaywright_browser_path=0\n');
console.log('✅ Created .npmrc to disable Playwright installation');

// Create a production environment file
fs.writeFileSync('.env.production', `
# Production Environment Configuration
NODE_ENV=production
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
SCRAPER_HTTP_ONLY_MODE=true
`);
console.log('✅ Created production environment file');

// Run the build process
try {
  console.log('🏗️ Building for production (no Playwright)...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('🚀 Deployment preparation complete!');
console.log('You can now deploy the application.');
