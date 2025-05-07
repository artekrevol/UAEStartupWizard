/**
 * Script to start the Scraper microservice
 */

// Import required modules
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SERVICE_NAME = 'Scraper Service';
const SERVICE_PORT = process.env.SCRAPER_SERVICE_PORT || 3004;
const NODE_ENV = process.env.NODE_ENV || 'development';
const RUN_INITIAL_SCRAPE = process.env.RUN_INITIAL_SCRAPE || 'false';

// Print banner
console.log('====================================');
console.log(`Starting ${SERVICE_NAME}`);
console.log('====================================');
console.log('Environment:', NODE_ENV);
console.log('Port:', SERVICE_PORT);
console.log('Run Initial Scrape:', RUN_INITIAL_SCRAPE);
console.log('====================================\n');

// Set environment variables
const env = {
  ...process.env,
  NODE_ENV,
  SCRAPER_SERVICE_PORT: SERVICE_PORT,
  RUN_INITIAL_SCRAPE
};

// Start the service using tsx
const servicePath = join(__dirname, 'services', 'scraper-service', 'index.ts');
const serviceProcess = spawn('npx', ['tsx', servicePath], { 
  env,
  stdio: 'inherit' 
});

// Handle process events
serviceProcess.on('error', (error) => {
  console.error(`Failed to start ${SERVICE_NAME}:`, error);
  process.exit(1);
});

serviceProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`${SERVICE_NAME} exited with code ${code}`);
    process.exit(code);
  }
  console.log(`${SERVICE_NAME} has been stopped`);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log(`\nStopping ${SERVICE_NAME}...`);
  serviceProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log(`\nStopping ${SERVICE_NAME}...`);
  serviceProcess.kill('SIGTERM');
});