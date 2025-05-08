import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticateJWT } from '../../../shared/middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { getServiceURL } from '../middleware/serviceRegistry';

const router = express.Router();

// Apply rate limiting
const documentRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Create proxy middleware for document service
const documentServiceProxy = createProxyMiddleware({
  target: getServiceURL('document-service'),
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Remove the /documents prefix when forwarding to the document service
    return path.replace(/^\/documents/, '/api/documents');
  },
  onProxyReq: (proxyReq, req, res) => {
    // Attach user information from JWT if authenticated
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.userId);
      proxyReq.setHeader('X-User-Role', req.user.role);
    }
  },
  onError: (err, req, res) => {
    console.error('[DocumentProxy] Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Document service is currently unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Public routes
router.get('/public', documentRateLimiter, documentServiceProxy);
router.get('/public/:documentId', documentRateLimiter, documentServiceProxy);
router.get('/categories', documentRateLimiter, documentServiceProxy);

// Protected routes
router.get('/', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.get('/:documentId', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.post('/', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.patch('/:documentId', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.delete('/:documentId', authenticateJWT, documentRateLimiter, documentServiceProxy);

// Document search routes
router.get('/search', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.post('/search', authenticateJWT, documentRateLimiter, documentServiceProxy);

// Document category routes
router.get('/category/:categoryId', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.post('/category', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.patch('/category/:categoryId', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.delete('/category/:categoryId', authenticateJWT, documentRateLimiter, documentServiceProxy);

// Document upload routes
router.post('/upload', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.post('/batch-upload', authenticateJWT, documentRateLimiter, documentServiceProxy);

// Document statistics routes
router.get('/stats', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.get('/stats/subcategories', authenticateJWT, documentRateLimiter, documentServiceProxy);

// Document processing routes
router.get('/process-dmcc', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.get('/public/process-dmcc', documentRateLimiter, documentServiceProxy);

// User documents routes
router.get('/user-documents/:id', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.get('/user-documents/user/:userId', authenticateJWT, documentRateLimiter, documentServiceProxy);
router.post('/user-documents', authenticateJWT, documentRateLimiter, documentServiceProxy);

export default router;