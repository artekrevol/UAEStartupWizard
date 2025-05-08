
/**
 * Production Server Entry Point (HTTP-only)
 */

// Force environment variables before any imports
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.NODE_ENV = 'production';

// Import the main server
import './index.js';

console.log('Production server started in HTTP-only mode');
