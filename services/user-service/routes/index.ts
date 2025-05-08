/**
 * User Service Routes
 * 
 * Combines all route modules for the user service
 */
import express from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import adminRoutes from './admin';
import { authenticateJwt, requireRole } from '../../../shared/middleware/authenticateJwt';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
});

// Auth routes (no authentication required)
router.use('/auth', authRoutes);

// User routes (authentication required)
router.use('/users', authenticateJwt, userRoutes);

// Admin routes (admin role required)
router.use('/admin', authenticateJwt, requireRole(['admin', 'superadmin']), adminRoutes);

export default router;