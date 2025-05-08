/**
 * Production Server Entry Point
 * 
 * This file is used as the entry point for the production server.
 * It includes additional error handling and environment variable validation
 * to ensure the application runs reliably in production.
 */

// Load environment variables with fallbacks first
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

console.log('Production server started with enhanced error handling');