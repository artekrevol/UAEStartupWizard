import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateJWT, requireAdmin } from '../../../shared/middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { getServiceURL } from '../middleware/serviceRegistry';

const router = express.Router();

// Apply rate limiting - stricter for admin endpoints
const adminRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs for admin operations
  standardHeaders: true,
  legacyHeaders: false
});

// Create proxy middleware for admin service
const adminUserServiceProxy = createProxyMiddleware({
  target: getServiceURL('user-service'),
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Rewrite path for the user service admin endpoints
    return path.replace(/^\/admin\/users/, '/api/users');
  },
  onError: (err, req, res) => {
    console.error('[AdminUserProxy] Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'User service is currently unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// All admin routes require authentication and admin role
router.use('/users', authenticateJWT, requireAdmin, adminRateLimiter, adminUserServiceProxy);

export default router;