/**
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
