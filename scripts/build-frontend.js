/**
 * Custom frontend build script
 * This is used to build the frontend without relying on package.json scripts
 */

import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildFrontend() {
  console.log('🏗️ Building frontend with Vite...');
  
  try {
    // Get root directory
    const rootDir = resolve(__dirname, '..');
    
    // Build frontend using production Vite config
    await build({
      root: resolve(rootDir, 'client'),
      configFile: resolve(rootDir, 'client', 'vite.config.production.js'),
      logLevel: 'info',
    });
    
    console.log('✅ Frontend build completed successfully');
  } catch (error) {
    console.error('❌ Frontend build failed:', error);
    process.exit(1);
  }
}

// Run the frontend build
buildFrontend();