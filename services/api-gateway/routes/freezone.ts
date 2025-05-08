import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateJWT, requireAdmin } from '../../../shared/middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { getServiceURL } from '../middleware/serviceRegistry';

const router = express.Router();

// Apply rate limiting
const freezoneRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Create proxy middleware for freezone service
const freezoneServiceProxy = createProxyMiddleware({
  target: getServiceURL('freezone-service'),
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Remove the /freezones prefix when forwarding to the freezone service
    return path.replace(/^\/freezones/, '/api/freezones');
  },
  onProxyReq: (proxyReq, req, res) => {
    // Attach user information from JWT if authenticated
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.userId);
      proxyReq.setHeader('X-User-Role', req.user.role);
    }
  },
  onError: (err, req, res) => {
    console.error('[FreezoneProxy] Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Freezone service is currently unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Public routes - anyone can view freezone information
router.get('/', freezoneRateLimiter, freezoneServiceProxy);
router.get('/list', freezoneRateLimiter, freezoneServiceProxy);
router.get('/:freezoneId', freezoneRateLimiter, freezoneServiceProxy);
router.get('/:freezoneId/details', freezoneRateLimiter, freezoneServiceProxy);
router.get('/compare', freezoneRateLimiter, freezoneServiceProxy);
router.get('/search', freezoneRateLimiter, freezoneServiceProxy);
router.get('/filter', freezoneRateLimiter, freezoneServiceProxy);

// Sector and industry routes
router.get('/sectors', freezoneRateLimiter, freezoneServiceProxy);
router.get('/sectors/:sectorId', freezoneRateLimiter, freezoneServiceProxy);
router.get('/industries', freezoneRateLimiter, freezoneServiceProxy);
router.get('/industries/:industryId', freezoneRateLimiter, freezoneServiceProxy);

// License types routes
router.get('/license-types', freezoneRateLimiter, freezoneServiceProxy);
router.get('/license-types/:licenseTypeId', freezoneRateLimiter, freezoneServiceProxy);

// Protected routes - only authenticated users can interact with these endpoints
router.post('/save-comparison', authenticateJWT, freezoneRateLimiter, freezoneServiceProxy);
router.get('/saved-comparisons', authenticateJWT, freezoneRateLimiter, freezoneServiceProxy);
router.delete('/saved-comparisons/:comparisonId', authenticateJWT, freezoneRateLimiter, freezoneServiceProxy);

// Admin routes - only admins can modify freezone data
router.post('/', authenticateJWT, requireAdmin, freezoneRateLimiter, freezoneServiceProxy);
router.patch('/:freezoneId', authenticateJWT, requireAdmin, freezoneRateLimiter, freezoneServiceProxy);
router.delete('/:freezoneId', authenticateJWT, requireAdmin, freezoneRateLimiter, freezoneServiceProxy);
router.post('/import', authenticateJWT, requireAdmin, freezoneRateLimiter, freezoneServiceProxy);
router.post('/bulk-update', authenticateJWT, requireAdmin, freezoneRateLimiter, freezoneServiceProxy);

export default router;