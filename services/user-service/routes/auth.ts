/**
 * Authentication Routes
 * 
 * Handles user registration, login, logout, and token management
 */
import { Router } from 'express';
import authController from '../controllers/authController';
import { authenticateJWT } from '../../../shared/middleware/authenticateJwt';

const router = Router();

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email/:token', authController.verifyEmail);

// Protected routes (authentication required)
router.use(authenticateJWT);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', authController.getCurrentUser);
router.post('/change-password', authController.changePassword);

// Session management
router.get('/sessions', authController.getSessions);
router.delete('/sessions/:id', authController.revokeSession);
router.delete('/sessions', authController.revokeAllSessions);

export default router;