import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateJWT } from '../../../shared/middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { getServiceURL } from '../middleware/serviceRegistry';

const router = express.Router();

// Apply rate limiting - stricter for authentication endpoints
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per windowMs for auth operations
  standardHeaders: true,
  legacyHeaders: false
});

// Create proxy middleware for user authentication service
const authServiceProxy = createProxyMiddleware({
  target: getServiceURL('user-service'),
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Rewrite path for the user service auth endpoints
    return path.replace(/^\/auth/, '/api/auth');
  },
  onError: (err, req, res) => {
    console.error('[AuthProxy] Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Authentication service is currently unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Public authentication routes
router.post('/login', authRateLimiter, authServiceProxy);
router.post('/register', authRateLimiter, authServiceProxy);
router.post('/logout', authServiceProxy);
router.post('/forgot-password', authRateLimiter, authServiceProxy);
router.post('/reset-password/:token', authRateLimiter, authServiceProxy);
router.get('/verify-email/:token', authServiceProxy);

// Protected authentication routes
router.get('/sessions', authenticateJWT, authRateLimiter, authServiceProxy);
router.delete('/sessions/:sessionId', authenticateJWT, authRateLimiter, authServiceProxy);
router.delete('/sessions', authenticateJWT, authRateLimiter, authServiceProxy);
router.post('/change-password', authenticateJWT, authRateLimiter, authServiceProxy);

export default router;