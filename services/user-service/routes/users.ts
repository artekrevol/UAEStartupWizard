/**
 * User Routes
 * 
 * Routes for managing user information, profiles, and settings
 * All routes require authentication
 */
import { Router } from 'express';
import userController from '../controllers/userController';
import { authenticateJWT } from '../../../shared/middleware/authenticateJwt';

const router = Router();

// User management
router.get('/', userController.getCurrentUser);
router.patch('/', userController.updateCurrentUser);
router.delete('/', userController.deleteCurrentUser);

// User profile
router.get('/profile', userController.getUserProfile);
router.patch('/profile', userController.updateUserProfile);

// Notifications
router.get('/notifications', userController.getUserNotifications);
router.patch('/notifications/:id/read', userController.markNotificationAsRead);
router.delete('/notifications/:id', userController.deleteNotification);

// User activity and sessions
router.get('/sessions', userController.getUserSessions);
router.get('/activity', userController.getUserActivity);

export default router;