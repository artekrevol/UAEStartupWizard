/**
 * Production-specific build script for the client
 * This handles the frontend build for production deployments
 */

import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper function to ensure a directory exists
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Main build function
async function buildProductionClient() {
  console.log('🏗️ Building frontend for production...');
  
  try {
    // Create output directory
    const outDir = path.resolve(rootDir, 'dist/client');
    ensureDirExists(outDir);
    
    // Copy shadcn component files which might be causing import issues
    const componentsDir = path.resolve(outDir, 'src/components');
    ensureDirExists(componentsDir);
    ensureDirExists(path.resolve(componentsDir, 'ui'));
    
    // Build using production config
    await build({
      root: __dirname,
      configFile: path.resolve(__dirname, 'vite.config.production.js'),
      logLevel: 'info'
    });
    
    console.log('✅ Frontend production build completed successfully');
  } catch (error) {
    console.error('❌ Frontend production build failed:', error);
    process.exit(1);
  }
}

// Run the build
buildProductionClient();