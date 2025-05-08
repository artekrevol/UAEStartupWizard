/**
 * Authentication Routes
 * 
 * Handles user authentication and session management
 */
import express from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateJwt } from '../../../shared/middleware/authenticateJwt';

const router = express.Router();
const authController = new AuthController();

// Public routes (no authentication required)
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Protected routes (authentication required)
router.use(authenticateJwt);
router.post('/logout', authController.logout);
router.get('/sessions', authController.getSessions);
router.delete('/sessions/:id', authController.revokeSession);
router.delete('/sessions', authController.revokeAllSessions);
router.put('/change-password', authController.changePassword);

export default router;