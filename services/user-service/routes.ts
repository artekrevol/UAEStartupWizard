/**
 * User Service Routes
 * 
 * Configures all API routes for the User Service
 */
import express from 'express';
import { login, register, requestPasswordReset, changePassword } from './controllers/auth-controller';
import { getUserById, listUsers, updateUserProfile, updateUserStatus, deleteUser } from './controllers/user-controller';
import { authenticateJWT, requireAdmin, requireOwnership } from '../../shared/middleware/auth';

const router = express.Router();

// Authentication routes (public)
router.post('/login', login);
router.post('/register', register);
router.post('/password-reset-request', requestPasswordReset);

// Protected user account routes
router.get('/users', authenticateJWT, requireAdmin, listUsers);
router.get('/users/:userId', authenticateJWT, requireOwnership('userId'), getUserById);
router.put('/users/:userId', authenticateJWT, requireOwnership('userId'), updateUserProfile);
router.patch('/users/:userId/password', authenticateJWT, requireOwnership('userId'), changePassword);
router.patch('/users/:userId/status', authenticateJWT, requireAdmin, updateUserStatus);
router.delete('/users/:userId', authenticateJWT, requireAdmin, deleteUser);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
});

export default router;
