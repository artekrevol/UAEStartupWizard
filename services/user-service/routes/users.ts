/**
 * User Routes
 */
import { Router } from 'express';
import { authenticateJWT, requireAdmin } from '../../../shared/middleware/auth';
import { UserController } from '../controllers/userController';

const router = Router();
const userController = new UserController();

// Public routes
router.get('/public-profile/:userId', userController.getPublicProfile);

// Protected user routes (require authentication)
router.get('/me', authenticateJWT, userController.getCurrentUser);
router.patch('/me/profile', authenticateJWT, userController.updateProfile);
router.patch('/me/account', authenticateJWT, userController.updateAccount);
router.patch('/me/preferences', authenticateJWT, userController.updatePreferences);
router.get('/me/notifications', authenticateJWT, userController.getNotifications);
router.patch('/me/notifications/:id', authenticateJWT, userController.markNotificationAsRead);
router.patch('/me/notifications', authenticateJWT, userController.markAllNotificationsAsRead);
router.get('/me/audit-logs', authenticateJWT, userController.getAuditLogs);

// Admin-only routes
router.get('/', authenticateJWT, requireAdmin, userController.getAllUsers);
router.post('/', authenticateJWT, requireAdmin, userController.createUser);
router.get('/:userId', authenticateJWT, requireAdmin, userController.getUser);
router.patch('/:userId', authenticateJWT, requireAdmin, userController.updateUser);
router.delete('/:userId', authenticateJWT, requireAdmin, userController.deleteUser);

export default router;