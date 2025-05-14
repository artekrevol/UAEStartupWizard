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
  'DATABASE_URL',
  'OPENAI_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

// Log warning for missing variables in deployment
if (missingVars.length > 0) {
  console.warn(`⚠️ Warning: Missing environment variables: ${missingVars.join(', ')}`);
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
