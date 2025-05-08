/**
 * Authentication Routes
 */
import { Router } from 'express';
import { authenticateJWT } from '../../../shared/middleware/auth';
import { AuthController } from '../controllers/authController';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password/:token', authController.resetPassword);

// Protected routes (require authentication)
router.get('/sessions', authenticateJWT, authController.getSessions);
router.delete('/sessions/:sessionId', authenticateJWT, authController.revokeSession);
router.delete('/sessions', authenticateJWT, authController.revokeAllSessions);
router.post('/change-password', authenticateJWT, authController.changePassword);

export default router;