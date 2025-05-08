import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateJWT } from '../../../shared/middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { getServiceURL } from '../middleware/serviceRegistry';

const router = express.Router();

// Apply rate limiting
const userRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Create proxy middleware for user service
const userServiceProxy = createProxyMiddleware({
  target: getServiceURL('user-service'),
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Remove the /users prefix when forwarding to the user service
    return path.replace(/^\/users/, '/api/users');
  },
  onProxyReq: (proxyReq, req, res) => {
    // Attach user information from JWT if authenticated
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.userId);
      proxyReq.setHeader('X-User-Role', req.user.role);
    }
  },
  onError: (err, req, res) => {
    console.error('[UserProxy] Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'User service is currently unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Public routes (no authentication required)
router.get('/public-profile/:userId', userRateLimiter, userServiceProxy);

// Protected routes (authentication required)
router.get('/me', authenticate, userRateLimiter, userServiceProxy);
router.patch('/me/profile', authenticate, userRateLimiter, userServiceProxy);
router.patch('/me/account', authenticate, userRateLimiter, userServiceProxy);
router.patch('/me/preferences', authenticate, userRateLimiter, userServiceProxy);
router.post('/me/newsletter', authenticate, userRateLimiter, userServiceProxy);

// Notification routes
router.get('/me/notifications', authenticate, userRateLimiter, userServiceProxy);
router.patch('/me/notifications/:notificationId/read', authenticate, userRateLimiter, userServiceProxy);
router.patch('/me/notifications/read-all', authenticate, userRateLimiter, userServiceProxy);

// Audit log routes
router.get('/me/audit-logs', authenticate, userRateLimiter, userServiceProxy);

export default router;