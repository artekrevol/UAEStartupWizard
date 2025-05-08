/**
 * Deployment script for UAE Free Zone Business Platform
 * This script prepares the application for deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper function to run a command and log output
function runCommand(command, errorMessage) {
  try {
    console.log(`> ${command}`);
    execSync(command, { stdio: 'inherit', cwd: rootDir });
    return true;
  } catch (error) {
    console.error(`❌ ${errorMessage || 'Command failed'}`);
    console.error(error.message);
    return false;
  }
}

// Main deployment function
async function deploy() {
  console.log('🚀 Starting deployment process...');

  // 1. Set environment variables for deployment
  process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
  process.env.USE_MEMORY_CACHE = 'true';
  process.env.NODE_ENV = 'production';

  // 2. Run pre-deployment setup
  console.log('🔧 Running pre-deployment setup...');
  if (!runCommand('node scripts/pre-deploy.js', 'Pre-deployment setup failed')) {
    process.exit(1);
  }

  // 3. Create environment file to ensure environment variables are available during build
  console.log('📝 Creating production environment file...');
  fs.writeFileSync(path.join(rootDir, '.env.production'), `# Production Environment Variables
SCRAPER_HTTP_ONLY_MODE=true
USE_MEMORY_CACHE=true
NODE_ENV=production
`);

  // 4. Fix TypeScript compatibility issues
  console.log('🔧 Applying TypeScript compatibility fixes...');
  fs.copyFileSync(
    path.join(rootDir, 'shared/middleware/performance-fixed.ts'),
    path.join(rootDir, 'shared/middleware/performance.ts')
  );

  // 5. Completely disable Playwright and browser dependencies
  console.log('⚙️ Setting npm config to skip Playwright installation...');
  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
  
  // Create .npmrc file to prevent Playwright installation
  console.log('📝 Creating .npmrc to prevent Playwright installation...');
  fs.writeFileSync(path.join(rootDir, '.npmrc'), 'playwright_skip_browser_download=1\nplaywright_browser_path=0');
  
  // Force HTTP-only mode in all environment files
  process.env.SCRAPER_HTTP_ONLY_MODE = 'true';

  // 6. Build frontend
  console.log('🏗️ Building frontend...');
  if (!runCommand('node client/build-production.js', 'Frontend build failed')) {
    process.exit(1);
  }

  // 7. Build backend without Playwright
  console.log('🏗️ Building backend (No Playwright)...');
  if (!runCommand(
    'npx esbuild server/production-no-playwright.js --platform=node --packages=external --bundle --format=esm --outdir=dist',
    'Backend build failed'
  )) {
    process.exit(1);
  }
  
  // 8. Copy the deployment package.json without Playwright to dist
  console.log('📄 Copying deployment package.json...');
  fs.copyFileSync(
    path.join(rootDir, 'scripts/deployment-package.json'),
    path.join(rootDir, 'dist/package.json')
  );

  console.log('✅ Deployment build completed successfully!');
  console.log('You can now deploy your application.');
}

// Run the deployment script
deploy();