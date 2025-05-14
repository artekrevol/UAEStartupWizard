/**
 * Build script for deployment with HTTP-only scraper
 * 
 * This script builds a version of the application that:
 * 1. Completely removes all Playwright dependencies
 * 2. Uses HTTP-only scraper implementation
 * 3. Creates a deployment-ready package
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Banner display
console.log('=================================================');
console.log('  UAE Business Setup Assistant - Deployment Build  ');
console.log('=================================================');
console.log('');
console.log('Building a version without Playwright dependencies...');
console.log('');

// Step 1: Set up environment variables
process.env.NODE_ENV = 'production';
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';

// Step 2: Create a clean build directory
const buildDir = path.resolve('build-no-playwright');
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Step 3: Create the package.json without Playwright
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Remove Playwright from dependencies and devDependencies
const filteredDependencies = Object.fromEntries(
  Object.entries(packageJson.dependencies || {})
    .filter(([key]) => !key.includes('playwright'))
);

const filteredDevDependencies = Object.fromEntries(
  Object.entries(packageJson.devDependencies || {})
    .filter(([key]) => !key.includes('playwright'))
);

// Create a new package.json without Playwright
const deploymentPackageJson = {
  ...packageJson,
  dependencies: filteredDependencies,
  devDependencies: filteredDevDependencies,
  scripts: {
    ...packageJson.scripts,
    build: 'vite build && esbuild server/production-http-only.js --platform=node --packages=external --bundle --format=esm --outdir=dist',
    start: 'NODE_ENV=production node dist/production-http-only.js'
  }
};

// Write the deployment package.json
fs.writeFileSync(
  path.join(buildDir, 'package.json'),
  JSON.stringify(deploymentPackageJson, null, 2)
);
console.log('✅ Created Playwright-free package.json');

// Step 4: Create a HTTP-only production entry point
const productionEntryContent = `/**
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
`;

// Create the HTTP-only production file
fs.mkdirSync(path.join(buildDir, 'server'), { recursive: true });
fs.writeFileSync(
  path.join(buildDir, 'server', 'production-http-only.js'),
  productionEntryContent
);
console.log('✅ Created HTTP-only production entry point');

// Step 5: Copy the scraper utility
fs.mkdirSync(path.join(buildDir, 'scraper/utils'), { recursive: true });
fs.copyFileSync(
  'scraper/utils/http_only_scraper.js',
  path.join(buildDir, 'scraper/utils', 'http_only_scraper.js')
);
console.log('✅ Copied HTTP-only scraper utility');

// Step 6: Copy required project files (excluding Playwright)
const copyDirectories = [
  'client',
  'public',
  'shared',
];

copyDirectories.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join(buildDir, dir), { recursive: true });
  }
});

// Copy individual files
const filesToCopy = [
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'index.html',
  'drizzle.config.ts'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(buildDir, file));
  }
});

console.log('✅ Copied project files (excluding Playwright)');

// Step 7: Copy the server directory (carefully to avoid Playwright)
function copyServerFiles(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    
    // Skip Playwright related files
    if (entry.name.includes('playwright') || entry.name === 'node_modules') {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyServerFiles(srcPath, destPath);
    } else {
      const content = fs.readFileSync(srcPath, 'utf8');
      
      // Skip files that import or use Playwright
      if (content.includes('playwright')) {
        continue;
      }
      
      fs.writeFileSync(destPath, content);
    }
  }
}

// Copy server files excluding Playwright
if (fs.existsSync('server')) {
  copyServerFiles('server', path.join(buildDir, 'server'));
}

// Copy scraper files excluding Playwright
if (fs.existsSync('scraper')) {
  copyServerFiles('scraper', path.join(buildDir, 'scraper'));
}

console.log('✅ Copied server and scraper files (excluding Playwright references)');

// Step 8: Create the .npmrc file
fs.writeFileSync(
  path.join(buildDir, '.npmrc'),
  'playwright_skip_browser_download=1\nplaywright_browser_path=0\n'
);
console.log('✅ Created .npmrc file');

// Step 9: Create a production environment file
fs.writeFileSync(
  path.join(buildDir, '.env.production'),
  `NODE_ENV=production
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
SCRAPER_HTTP_ONLY_MODE=true
`
);
console.log('✅ Created production environment file');

// Step 10: Create a deployment script
fs.writeFileSync(
  path.join(buildDir, 'deploy.sh'),
  `#!/bin/bash
# Deployment script

export NODE_ENV=production
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true

echo "🏗️ Building for deployment..."
npm run build

echo "✅ Build complete. Ready for deployment!"
`
);
fs.chmodSync(path.join(buildDir, 'deploy.sh'), 0o755);
console.log('✅ Created deployment script');

// Step 11: Create a README for the deployment build
fs.writeFileSync(
  path.join(buildDir, 'README.md'),
  `# UAE Business Setup Assistant - Deployment Build

This is a deployment-ready build of the UAE Business Setup Assistant, with all Playwright dependencies removed.

## Features

- Uses HTTP-only scraping for data collection
- No browser dependencies required
- Optimized for production deployment

## Deployment Instructions

1. Make sure all environment variables are set (especially API keys)
2. Run the deployment script:
   \`\`\`
   ./deploy.sh
   \`\`\`
3. Deploy the built application to your hosting provider

## HTTP-Only Mode

This build operates in HTTP-only mode, which means:
- All scrapers use HTTP requests instead of browser automation
- No Playwright or browser dependencies are required
- The application is more lightweight and deployment-friendly

Note that some advanced scraping features might be limited in this mode,
but all critical functionality is preserved.
`
);
console.log('✅ Created deployment README');

// Step 12: Create scripts directory with deployment utilities
fs.mkdirSync(path.join(buildDir, 'scripts'), { recursive: true });

// Create deployment setup script
fs.writeFileSync(
  path.join(buildDir, 'scripts', 'deployment-setup.js'),
  `/**
 * Deployment Setup Script
 * 
 * This script runs during deployment to:
 * 1. Set up appropriate fallbacks for environment variables
 * 2. Handle Playwright configuration for deployment environment
 */

console.log('🚀 Running deployment setup script...');

// Check and set required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'OPENAI_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

// Log warning for missing variables in deployment
if (missingVars.length > 0) {
  console.warn(\`⚠️ Warning: Missing environment variables: \${missingVars.join(', ')}\`);
  console.warn('The application may not function correctly without these variables.');
}

// Configure for deployment environment
try {
  // Check if we're in a deployment environment
  const isDeployment = process.env.NODE_ENV === 'production' || process.env.REPL_SLUG;
  
  if (isDeployment) {
    // Modify scraper configuration to disable browser-dependent features in production
    console.log('📝 Configuring scraper for deployment environment...');
    
    // Set environment variable to signal scrapers to use HTTP-only mode
    process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
    
    console.log('✅ Scraper configured to use HTTP-only mode');
  }
} catch (error) {
  console.error('⚠️ Error configuring deployment settings:', error.message);
}

console.log('✅ Deployment setup complete');
`
);

// Create a deploy-no-playwright script
fs.writeFileSync(
  path.join(buildDir, 'scripts', 'deploy-no-playwright.js'),
  `/**
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
fs.writeFileSync('.npmrc', 'playwright_skip_browser_download=1\\nplaywright_browser_path=0\\n');
console.log('✅ Created .npmrc to disable Playwright installation');

// Create a production environment file
fs.writeFileSync('.env.production', \`
# Production Environment Configuration
NODE_ENV=production
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
SCRAPER_HTTP_ONLY_MODE=true
\`);
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
`
);

console.log('✅ Created deployment scripts');

// Final message
console.log('');
console.log('✅ Build completed successfully!');
console.log('');
console.log('Your Playwright-free deployment build is ready in the build-no-playwright directory.');
console.log('');
console.log('To deploy:');
console.log('1. cd build-no-playwright');
console.log('2. Use the Deploy button in Replit');
console.log('');
console.log('This build completely removes Playwright dependencies and replaces them');
console.log('with an HTTP-only scraper implementation.');