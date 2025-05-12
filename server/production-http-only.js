
import express from 'express';
import compression from 'compression';
import { registerRoutes } from './routes';
import path from 'path';

// Force environment variables
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.USE_HTTP_ONLY_SCRAPER = 'true'; 
process.env.NODE_ENV = 'production';

// Mock Playwright to prevent any attempts to use it
try {
  // This will intercept any attempt to import playwright
  global.playwright = {
    chromium: {
      launch: () => {
        console.log('[HTTP-ONLY MODE] Playwright browser launch prevented');
        throw new Error('Playwright is disabled in HTTP-only mode');
      }
    },
    firefox: {
      launch: () => {
        console.log('[HTTP-ONLY MODE] Playwright browser launch prevented');
        throw new Error('Playwright is disabled in HTTP-only mode');
      }
    },
    webkit: {
      launch: () => {
        console.log('[HTTP-ONLY MODE] Playwright browser launch prevented');
        throw new Error('Playwright is disabled in HTTP-only mode');
      }
    }
  };
  console.log('[HTTP-ONLY MODE] Playwright mocking enabled');
} catch (e) {
  console.log('[HTTP-ONLY MODE] Failed to set up Playwright mocking:', e.message);
}

const app = express();

// Enable compression
app.use(compression());

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files
app.use(express.static(path.join(process.cwd(), 'dist/public')));

// Register API routes
registerRoutes(app);

const port = process.env.PORT || 5000;

// Start server with error handling
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Production server running on port ${port}`);
  console.log(`Health check available at: http://localhost:${port}/healthz`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please try a different port.`);
    process.exit(1); // Exit to allow Railway to retry
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
