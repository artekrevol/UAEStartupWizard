import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { rateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../../../shared/middleware/auth';
import { getServiceURL } from '../middleware/serviceRegistry';

const router = express.Router();

// Apply stricter rate limiting to auth endpoints
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts, please try again later.'
});

// Create proxy middleware for auth service
const authServiceProxy = createProxyMiddleware({
  target: getServiceURL('user-service'),
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Remove the /auth prefix when forwarding to the user service
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
router.post('/register', authRateLimiter, authServiceProxy);
router.post('/login', authRateLimiter, authServiceProxy);
router.post('/logout', authServiceProxy);
router.post('/refresh-token', authRateLimiter, authServiceProxy);
router.get('/verify-email/:token', authServiceProxy);
router.post('/forgot-password', authRateLimiter, authServiceProxy);
router.post('/reset-password/:token', authRateLimiter, authServiceProxy);

// Protected authentication routes
router.get('/sessions', authenticate, authServiceProxy);
router.delete('/sessions/:sessionId', authenticate, authServiceProxy);
router.delete('/sessions', authenticate, authServiceProxy);
router.post('/change-password', authenticate, authRateLimiter, authServiceProxy);

export default router;