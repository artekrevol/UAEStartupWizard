/**
 * Pre-Deployment Script
 * 
 * This script should be run manually before deploying:
 * node scripts/pre-deploy.js
 * 
 * It will:
 * 1. Set up HTTP-only mode for scrapers to avoid Playwright dependency issues
 * 2. Create necessary fallbacks for environment variables in production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🚀 Running pre-deployment configuration...');

// Modify the scraper configuration to use HTTP-only mode
try {
  // Get current directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Create or update a config file for HTTP-only mode
  const configPath = path.join(__dirname, '..', 'scraper', 'config.js');
  const configContent = `/**
 * Scraper Configuration
 * Auto-generated for deployment - DO NOT EDIT MANUALLY
 */
export const scraperConfig = {
  httpOnlyMode: true,
  useMemoryCacheForRedis: true,
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 30000
};
`;

  fs.writeFileSync(configPath, configContent);
  console.log('✅ Created HTTP-only configuration for scrapers');

  // Create a .env.production file with fallback values
  const envPath = path.join(__dirname, '..', '.env.production');
  const envContent = `# Production environment variables
# Auto-generated for deployment - Override with actual values in Replit Secrets

# Fallback configuration for services
USE_MEMORY_CACHE=true
SCRAPER_HTTP_ONLY_MODE=true

# You should set these values in Replit Secrets
# JWT_SECRET=your-secret-here
# REDIS_URL=your-redis-url-here
# API_GATEWAY_URL=your-api-gateway-url-here
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created production environment file with fallbacks');

  // Create a deployment marker file
  const markerPath = path.join(__dirname, '..', '.deployment-ready');
  fs.writeFileSync(markerPath, new Date().toISOString());
  console.log('✅ Created deployment marker file');
} catch (error) {
  console.error('❌ Error during pre-deployment setup:', error.message);
  process.exit(1);
}

console.log('');
console.log('✅ Pre-deployment setup completed successfully');
console.log('');
console.log('IMPORTANT: Before deploying, make sure to:');
console.log('1. Set up required secrets in Replit Secrets panel');
console.log('2. Enable "Always On" in the project settings');
console.log('');