/**
 * Production Server Entry Point (No Playwright)
 * 
 * This file is the entry point for production deployment where
 * Playwright is completely disabled to prevent installation issues.
 */

// Set environment variable to disable Playwright before any imports
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';

// Load environment variables with fallbacks
import { loadEnvironment, isProduction } from '../shared/env-loader.js';

// Verify we're in production mode
if (!isProduction) {
  console.warn('Warning: Production server started in non-production environment');
}

// Import the main server
import './index.js';

// Set up global error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION - Application will continue running:');
  console.error(error);
  
  // Optionally implement alert/monitoring here
});

// Set up global error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED PROMISE REJECTION - Application will continue running:');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  
  // Optionally implement alert/monitoring here
});

// Set up graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');
  // Any cleanup needed
  process.exit(0);
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Production server started with enhanced error handling and HTTP-only mode enabled');