/**
 * User Routes
 * 
 * Handles user profile management and user-specific operations
 */
import express from 'express';
import { UserController } from '../controllers/userController';

const router = express.Router();
const userController = new UserController();

// User profile operations
router.get('/me', userController.getCurrentUser);
router.put('/me', userController.updateCurrentUser);
router.delete('/me', userController.deleteCurrentUser);

// User profile operations
router.get('/me/profile', userController.getUserProfile);
router.put('/me/profile', userController.updateUserProfile);

// Notification management
router.get('/notifications', userController.getUserNotifications);
router.put('/notifications/:id/read', userController.markNotificationAsRead);
router.put('/notifications/read-all', userController.markAllNotificationsAsRead);
router.delete('/notifications/:id', userController.deleteNotification);

// User sessions and activity
router.get('/sessions', userController.getUserSessions);
router.get('/activity', userController.getUserActivity);

export default router;