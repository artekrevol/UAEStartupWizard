/**
 * User Controller
 * 
 * Handles user profile management and user-specific operations
 */
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { UserErrorCode, createUserError } from '../errors/userErrors';
import userRepository from '../repositories/userRepository';
import { InsertUserProfileSchema } from '../schema';
import { asyncHandler } from '../../../shared/middleware/asyncHandler';

export class UserController {
  /**
   * Get current user information
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const userId = (req.user as JwtPayload).sub as number;
      
      // Get user with profile
      const user = await userRepository.findUserById(userId);
      
      if (!user) {
        throw createUserError(UserErrorCode.USER_NOT_FOUND);
      }
      
      // Get user profile
      const profile = await userRepository.findProfileByUserId(userId);
      
      // Count unread notifications
      const { notifications, total } = await userRepository.findNotificationsByUserId(
        userId,
        10,
        0,
        true // unread only
      );
      
      // Sanitize user data
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        verified: user.verified,
        profile: profile || null,
        unreadNotificationsCount: total,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      };
      
      res.json({
        success: true,
        user: userData,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Update user profile information
   */
  updateProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const userId = (req.user as JwtPayload).sub as number;
      
      // Validate input data
      try {
        InsertUserProfileSchema.partial().parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          const validationError = fromZodError(err);
          throw createUserError(
            UserErrorCode.INVALID_INPUT,
            validationError.message,
            400
          );
        }
        throw err;
      }
      
      // First check if profile exists
      const existingProfile = await userRepository.findProfileByUserId(userId);
      
      let profile;
      if (existingProfile) {
        // Update existing profile
        profile = await userRepository.updateProfile(userId, req.body);
      } else {
        // Create new profile
        profile = await userRepository.createProfile({
          userId,
          ...req.body,
        });
      }
      
      // Log profile update
      await userRepository.createAuditLog({
        userId,
        action: 'user.profile.update',
        details: {
          fields: Object.keys(req.body),
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({
        success: true,
        profile,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Delete user account
   */
  deleteAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const userId = (req.user as JwtPayload).sub as number;
      
      // Get user
      const user = await userRepository.findUserById(userId);
      
      if (!user) {
        throw createUserError(UserErrorCode.USER_NOT_FOUND);
      }
      
      // Create audit log first (before user is deleted)
      await userRepository.createAuditLog({
        userId,
        action: 'user.account.delete',
        details: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          email: user.email,
          username: user.username,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      // Delete sessions
      await userRepository.deleteUserSessions(userId);
      
      // Delete profile, notifications, and other associated data
      // These should cascade due to the database constraints
      
      // Finally delete the user
      await userRepository.deleteUser(userId);
      
      res.json({
        success: true,
        message: 'Account successfully deleted',
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Get user profile information
   */
  getProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const userId = (req.user as JwtPayload).sub as number;
      
      // Get user
      const user = await userRepository.findUserById(userId);
      
      if (!user) {
        throw createUserError(UserErrorCode.USER_NOT_FOUND);
      }
      
      // Get profile
      const profile = await userRepository.findProfileByUserId(userId);
      
      if (!profile) {
        throw createUserError(UserErrorCode.PROFILE_NOT_FOUND);
      }
      
      res.json({
        success: true,
        profile,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Get user notifications with pagination
   */
  getNotifications = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const userId = (req.user as JwtPayload).sub as number;
      
      // Parse pagination parameters
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';
      
      // Fetch notifications
      const { notifications, total } = await userRepository.findNotificationsByUserId(
        userId,
        limit,
        offset,
        unreadOnly
      );
      
      // Get count of unread notifications for badge display
      const unreadCount = unreadOnly ? total : await userRepository.findNotificationsByUserId(
        userId,
        1,
        0,
        true
      ).total;
      
      res.json({
        success: true,
        notifications,
        pagination: {
          total,
          limit,
          offset,
          unreadCount,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Mark a notification as read
   */
  markNotificationAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const userId = (req.user as JwtPayload).sub as number;
      const notificationId = parseInt(req.params.id);
      
      if (isNaN(notificationId)) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid notification ID',
          400
        );
      }
      
      // Get notification to verify ownership
      const notification = await userRepository.findNotificationById(notificationId);
      
      if (!notification) {
        throw createUserError(UserErrorCode.NOTIFICATION_NOT_FOUND);
      }
      
      // Verify ownership
      if (notification.userId !== userId) {
        throw createUserError(UserErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      
      // Mark as read
      const updatedNotification = await userRepository.markNotificationAsRead(notificationId);
      
      res.json({
        success: true,
        notification: updatedNotification,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const userId = (req.user as JwtPayload).sub as number;
      
      // Mark all as read
      const count = await userRepository.markAllNotificationsAsRead(userId);
      
      res.json({
        success: true,
        count,
        message: `Marked ${count} notifications as read`,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Delete a notification
   */
  deleteNotificationById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const userId = (req.user as JwtPayload).sub as number;
      const notificationId = parseInt(req.params.id);
      
      if (isNaN(notificationId)) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid notification ID',
          400
        );
      }
      
      // Get notification to verify ownership
      const notification = await userRepository.findNotificationById(notificationId);
      
      if (!notification) {
        throw createUserError(UserErrorCode.NOTIFICATION_NOT_FOUND);
      }
      
      // Verify ownership
      if (notification.userId !== userId) {
        throw createUserError(UserErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      
      // Delete notification
      await userRepository.deleteNotification(notificationId);
      
      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Get user's active sessions
   */
  getSessions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const userId = (req.user as JwtPayload).sub as number;
      
      // Get sessions
      const sessions = await userRepository.findSessionsByUserId(userId);
      
      // Sanitize session data (remove tokens)
      const sanitizedSessions = sessions.map(session => ({
        id: session.id,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceInfo: session.deviceInfo,
        isRevoked: session.isRevoked,
        // Current session flag
        isCurrent: req.headers.authorization?.includes(session.token) || false,
      }));
      
      res.json({
        success: true,
        sessions: sanitizedSessions,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Get user activity logs
   */
  getActivity = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const userId = (req.user as JwtPayload).sub as number;
      
      // Parse pagination parameters
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get activity logs
      const { logs, total } = await userRepository.findAuditLogs(
        limit,
        offset,
        userId
      );
      
      res.json({
        success: true,
        activities: logs,
        pagination: {
          total,
          limit,
          offset,
        },
      });
    } catch (err) {
      next(err);
    }
  });
}

export default new UserController();