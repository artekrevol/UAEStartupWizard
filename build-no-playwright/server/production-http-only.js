
/**
 * Production HTTP-Only Server
 * 
 * This is a simplified server for production without Playwright dependencies.
 */

import express from 'express';
import compression from 'compression';
import { registerRoutes } from './routes.js';
import path from 'path';

// Force environment variables
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.NODE_ENV = 'production';

const app = express();

// Enable compression
app.use(compression());

// Serve static files
app.use(express.static(path.join(process.cwd(), 'dist/public')));

// Register API routes
registerRoutes(app);

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Production server running on port ${port}`);
});
