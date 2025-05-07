import express from 'express';
import { AuthController } from './controllers/authController';
import { UserController } from './controllers/userController';
import { authenticate } from '../../shared/middleware/auth';
import { rateLimiter } from '../../services/api-gateway/middleware/rateLimiter';

const router = express.Router();

// Initialize controllers
const authController = new AuthController();
const userController = new UserController();

/**
 * Authentication Routes
 */
// Apply stricter rate limiting to auth endpoints
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts, please try again later.'
});

// Public authentication routes
router.post('/auth/register', authRateLimiter, authController.register);
router.post('/auth/login', authRateLimiter, authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/refresh-token', authRateLimiter, authController.refreshToken);
router.get('/auth/verify-email/:token', authController.verifyEmail);
router.post('/auth/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/auth/reset-password/:token', authRateLimiter, authController.resetPassword);

// Protected authentication routes
router.get('/auth/sessions', authenticate, authController.getSessions);
router.delete('/auth/sessions/:sessionId', authenticate, authController.revokeSession);
router.delete('/auth/sessions', authenticate, authController.revokeAllSessions);
router.post('/auth/change-password', authenticate, authRateLimiter, authController.changePassword);

/**
 * User Routes
 */
// All user routes are protected
router.get('/users/me', authenticate, userController.getCurrentUser);
router.patch('/users/me/profile', authenticate, userController.updateProfile);
router.patch('/users/me/account', authenticate, userController.updateAccount);
router.patch('/users/me/preferences', authenticate, userController.updatePreferences);
router.post('/users/me/newsletter', authenticate, userController.toggleNewsletter);

// Notification routes
router.get('/users/me/notifications', authenticate, userController.getNotifications);
router.patch('/users/me/notifications/:notificationId/read', authenticate, userController.markNotificationRead);
router.patch('/users/me/notifications/read-all', authenticate, userController.markAllNotificationsRead);

// Audit log routes
router.get('/users/me/audit-logs', authenticate, userController.getAuditLogs);

// Admin routes
router.get('/admin/users', authenticate, userController.getAllUsers);
router.get('/admin/users/:userId', authenticate, userController.getUserById);
router.patch('/admin/users/:userId/status', authenticate, userController.updateUserStatus);
router.delete('/admin/users/:userId', authenticate, userController.deleteUser);

export default router;