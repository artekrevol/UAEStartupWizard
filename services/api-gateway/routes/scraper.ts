import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticate } from '../../../shared/middleware/auth';
import { authorizeAdmin } from '../middleware/authorization';
import { rateLimiter } from '../middleware/rateLimiter';
import { getServiceURL } from '../middleware/serviceRegistry';

const router = express.Router();

// Apply rate limiting to scraper endpoints
const scraperRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute (scraping is resource-intensive)
  standardHeaders: true,
  legacyHeaders: false
});

// Create proxy middleware for scraper service
const scraperServiceProxy = createProxyMiddleware({
  target: getServiceURL('scraper-service'),
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Remove the /scraper prefix when forwarding to the scraper service
    return path.replace(/^\/scraper/, '/api/scraper');
  },
  onProxyReq: (proxyReq, req, res) => {
    // Attach user information from JWT if authenticated
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.userId);
      proxyReq.setHeader('X-User-Role', req.user.role);
    }
  },
  onError: (err, req, res) => {
    console.error('[ScraperProxy] Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Scraper service is currently unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Middleware to ensure the user is authenticated and has admin role
const adminMiddleware = [authenticate, authorizeAdmin];

// Admin-only routes (require authentication)
router.post('/free-zones', adminMiddleware, scraperRateLimiter, scraperServiceProxy);
router.post('/establishment-guides', adminMiddleware, scraperRateLimiter, scraperServiceProxy);
router.post('/free-zone-website', adminMiddleware, scraperRateLimiter, scraperServiceProxy);
router.post('/schedule', adminMiddleware, scraperRateLimiter, scraperServiceProxy);

// Status endpoint (accessible by all authenticated users)
router.get('/status', authenticate, scraperRateLimiter, scraperServiceProxy);

export default router;