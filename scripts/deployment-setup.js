/**
 * Deployment Setup Script
 * 
 * This script runs during deployment to:
 * 1. Set up appropriate fallbacks for environment variables
 * 2. Handle Playwright configuration for deployment environment
 */

console.log('🚀 Running deployment setup script...');

// Check and set required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'API_GATEWAY_URL',
  'USER_SERVICE_URL',
  'DOCUMENT_SERVICE_URL',
  'FREEZONE_SERVICE_URL',
  'SCRAPER_SERVICE_URL',
  'AI_RESEARCH_SERVICE_URL'
];

let missingVars = [];

// Check required environment variables and set defaults if possible
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    // For some variables we can provide fallbacks
    switch (envVar) {
      case 'JWT_SECRET':
        // Generate a random JWT secret if not provided
        process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
        console.log(`✅ Generated random JWT_SECRET for deployment`);
        break;
      case 'REDIS_URL':
        // Fall back to memory cache when Redis is not available
        console.log(`⚠️ REDIS_URL not found. Will use memory cache fallback`);
        process.env.USE_MEMORY_CACHE = 'true';
        break;
      default:
        // For critical variables, add to missing list
        missingVars.push(envVar);
    }
  }
}

// Warn about missing environment variables but don't fail deployment
if (missingVars.length > 0) {
  console.warn(`⚠️ Warning: Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('The application may not function correctly without these variables.');
}

// Configure Playwright for deployment environment
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

console.log('✅ Deployment setup completed successfully');