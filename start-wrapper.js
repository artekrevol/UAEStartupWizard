#!/usr/bin/env node

/**
 * Production wrapper script for HTTP-only mode
 * This script provides additional error handling and safeguards for the application
 */

// Set environment variables for safety
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = 'true';
process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.USE_HTTP_ONLY_SCRAPER = 'true';
process.env.PLAYWRIGHT_SKIP_VALIDATION = 'true';

// Global unhandled error and rejection handlers
process.on('uncaughtException', (err) => {
  // Only log but don't terminate for Playwright-related errors
  if (err.message && (
    err.message.includes('playwright') || 
    err.message.includes('browser') || 
    err.message.includes('Playwright') ||
    err.message.includes('Browser')
  )) {
    console.error('[HTTP-ONLY MODE] Intercepted uncaught exception (continuing):', err.message);
    return; // Don't crash for Playwright errors
  }
  
  // For other errors, log and exit if critical
  console.error('Uncaught exception:', err);
  if (err.message && err.message.includes('FATAL:')) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason) => {
  // Only log but don't terminate for Playwright-related promise rejections
  if (reason && typeof reason === 'object' && reason.message && (
    reason.message.includes('playwright') || 
    reason.message.includes('browser') || 
    reason.message.includes('Playwright') ||
    reason.message.includes('Browser')
  )) {
    console.error('[HTTP-ONLY MODE] Intercepted unhandled promise rejection (continuing):', 
      reason.message);
    return; // Don't crash for Playwright errors
  }
  
  // For other unhandled rejections, log them
  console.error('Unhandled promise rejection:', reason);
});

console.log('[HTTP-ONLY MODE] Starting application with wrapper safeguards');

// Import and run the main application
import('./dist/production-http-only.js').catch(err => {
  console.error('Error importing application:', err);
  process.exit(1);
});