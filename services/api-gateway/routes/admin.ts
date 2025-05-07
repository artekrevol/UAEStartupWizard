import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticate } from '../../../shared/middleware/auth';
import { authorizeAdmin } from '../middleware/authorization';
import { rateLimiter } from '../middleware/rateLimiter';
import { getServiceURL } from '../middleware/serviceRegistry';

const router = express.Router();

// Apply stricter rate limiting for admin routes
const adminRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware to ensure the user is authenticated and has admin role
const adminMiddleware = [authenticate, authorizeAdmin];

// Create proxy middleware for user service admin routes
const userServiceAdminProxy = createProxyMiddleware({
  target: getServiceURL('user-service'),
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Rewrite path to the appropriate admin endpoint in user service
    return path.replace(/^\/admin\/users/, '/api/admin/users');
  },
  onProxyReq: (proxyReq, req, res) => {
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.userId);
      proxyReq.setHeader('X-User-Role', req.user.role);
    }
  },
  onError: (err, req, res) => {
    console.error('[AdminUserProxy] Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'User service admin endpoint is currently unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Create proxy middleware for document service admin routes
const documentServiceAdminProxy = createProxyMiddleware({
  target: getServiceURL('document-service'),
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Rewrite path to the appropriate admin endpoint in document service
    return path.replace(/^\/admin\/documents/, '/api/admin/documents');
  },
  onProxyReq: (proxyReq, req, res) => {
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.userId);
      proxyReq.setHeader('X-User-Role', req.user.role);
    }
  },
  onError: (err, req, res) => {
    console.error('[AdminDocumentProxy] Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Document service admin endpoint is currently unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Create proxy middleware for freezone service admin routes
const freezoneServiceAdminProxy = createProxyMiddleware({
  target: getServiceURL('freezone-service'),
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Rewrite path to the appropriate admin endpoint in freezone service
    return path.replace(/^\/admin\/freezones/, '/api/admin/freezones');
  },
  onProxyReq: (proxyReq, req, res) => {
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.userId);
      proxyReq.setHeader('X-User-Role', req.user.role);
    }
  },
  onError: (err, req, res) => {
    console.error('[AdminFreezoneProxy] Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Freezone service admin endpoint is currently unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Dashboard and analytics routes
router.get('/dashboard', adminMiddleware, adminRateLimiter, userServiceAdminProxy);
router.get('/stats', adminMiddleware, adminRateLimiter, userServiceAdminProxy);

// User management routes
router.get('/users', adminMiddleware, adminRateLimiter, userServiceAdminProxy);
router.get('/users/:userId', adminMiddleware, adminRateLimiter, userServiceAdminProxy);
router.post('/users', adminMiddleware, adminRateLimiter, userServiceAdminProxy);
router.patch('/users/:userId', adminMiddleware, adminRateLimiter, userServiceAdminProxy);
router.delete('/users/:userId', adminMiddleware, adminRateLimiter, userServiceAdminProxy);
router.patch('/users/:userId/role', adminMiddleware, adminRateLimiter, userServiceAdminProxy);
router.patch('/users/:userId/status', adminMiddleware, adminRateLimiter, userServiceAdminProxy);

// Document management routes
router.get('/documents', adminMiddleware, adminRateLimiter, documentServiceAdminProxy);
router.get('/documents/:documentId', adminMiddleware, adminRateLimiter, documentServiceAdminProxy);
router.post('/documents', adminMiddleware, adminRateLimiter, documentServiceAdminProxy);
router.patch('/documents/:documentId', adminMiddleware, adminRateLimiter, documentServiceAdminProxy);
router.delete('/documents/:documentId', adminMiddleware, adminRateLimiter, documentServiceAdminProxy);
router.post('/documents/import', adminMiddleware, adminRateLimiter, documentServiceAdminProxy);
router.post('/documents/bulk-update', adminMiddleware, adminRateLimiter, documentServiceAdminProxy);

// Freezone management routes
router.get('/freezones', adminMiddleware, adminRateLimiter, freezoneServiceAdminProxy);
router.get('/freezones/:freezoneId', adminMiddleware, adminRateLimiter, freezoneServiceAdminProxy);
router.post('/freezones', adminMiddleware, adminRateLimiter, freezoneServiceAdminProxy);
router.patch('/freezones/:freezoneId', adminMiddleware, adminRateLimiter, freezoneServiceAdminProxy);
router.delete('/freezones/:freezoneId', adminMiddleware, adminRateLimiter, freezoneServiceAdminProxy);
router.post('/freezones/import', adminMiddleware, adminRateLimiter, freezoneServiceAdminProxy);
router.post('/freezones/bulk-update', adminMiddleware, adminRateLimiter, freezoneServiceAdminProxy);

// System settings routes
router.get('/settings', adminMiddleware, adminRateLimiter, userServiceAdminProxy);
router.patch('/settings', adminMiddleware, adminRateLimiter, userServiceAdminProxy);

// Audit logs routes
router.get('/audit-logs', adminMiddleware, adminRateLimiter, userServiceAdminProxy);
router.get('/audit-logs/:logId', adminMiddleware, adminRateLimiter, userServiceAdminProxy);

export default router;