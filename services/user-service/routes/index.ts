/**
 * User Service Routes Index
 * 
 * Centralizes all routes for the user service
 */
import { Router } from 'express';
import { notFoundHandler, errorHandler } from '../../../shared/middleware/errorHandler';
import { authenticateJWT } from '../../../shared/middleware/authenticateJwt';

// Import route modules
import authRoutes from './auth';
import userRoutes from './users';
import adminRoutes from './admin';

const router = Router();

// API documentation route
router.get('/', (req, res) => {
  res.json({
    service: 'User Service',
    version: '1.0.0',
    endpoints: {
      '/auth': 'Authentication endpoints',
      '/users': 'User management endpoints',
      '/admin': 'Admin management endpoints',
    },
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'user-service',
  });
});

// Register route modules
router.use('/auth', authRoutes);
router.use('/users', authenticateJWT, userRoutes);
router.use('/admin', adminRoutes);

// Error handling
router.use(notFoundHandler);
router.use(errorHandler);

export default router;