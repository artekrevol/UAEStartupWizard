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

// Run the build commands
try {
  console.log('🏗️ Building frontend...');
  execSync('vite build', { stdio: 'inherit' });
  
  console.log('🏗️ Building backend (No Playwright)...');
  execSync('esbuild server/production-no-playwright.js --platform=node --packages=external --bundle --format=esm --outdir=dist', 
    { stdio: 'inherit' });
  
  // Copy the production-no-playwright.js to the dist folder as index.js
  fs.copyFileSync(
    path.resolve('server/production-no-playwright.js'), 
    path.resolve('dist/index.js')
  );
  
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Create a deployment-ready package.json that excludes Playwright
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Create a minimal version for deployment
const deploymentPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: 'module',
  main: 'index.js',
  scripts: {
    start: 'node index.js'
  },
  engines: {
    node: '>=18.0.0'
  },
  // Keep only needed dependencies, excluding Playwright
  dependencies: Object.fromEntries(
    Object.entries(packageJson.dependencies)
      .filter(([key]) => !key.includes('playwright'))
  )
};

// Write the deployment package.json to dist
fs.writeFileSync(
  path.resolve('dist/package.json'),
  JSON.stringify(deploymentPackageJson, null, 2)
);

console.log('✅ Created deployment-ready package.json');
console.log('🎉 Deployment preparation complete!');
console.log('');
console.log('To deploy:');
console.log('1. Click the "Deploy" button in your Replit project');
console.log('2. When prompted, use the "build:no-playwright" script');
console.log('3. Ensure the NODE_ENV=production environment variable is set');