/**
 * User Controller
 * 
 * Handles user profile management and user-specific operations
 */
import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { User, UserProfile, InsertUserProfile, UserErrorCode } from '../schema';
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError, 
  UnauthorizedError 
} from '../../../shared/errors/ApiError';
import { asyncHandler } from '../../../shared/middleware/errorHandler';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../db';
import bcrypt from 'bcrypt';
import { config } from '../../../shared/config';

export class UserController {
  private userRepository: UserRepository;

  constructor() {
    const db = drizzle(pool);
    this.userRepository = new UserRepository(db);

    // Bind methods to this instance
    this.getCurrentUser = this.getCurrentUser.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.deleteAccount = this.deleteAccount.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.getNotifications = this.getNotifications.bind(this);
    this.markNotificationAsRead = this.markNotificationAsRead.bind(this);
    this.markAllNotificationsAsRead = this.markAllNotificationsAsRead.bind(this);
    this.deleteNotificationById = this.deleteNotificationById.bind(this);
    this.getSessions = this.getSessions.bind(this);
    this.getActivity = this.getActivity.bind(this);
  }

  /**
   * Get current user information
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    
    const user = await this.userRepository.getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found', UserErrorCode.USER_NOT_FOUND);
    }
    
    // Get unread notifications count
    const unreadNotifications = await this.userRepository.countUnreadNotifications(userId);
    
    res.json({
      success: true,
      data: this.sanitizeUserData(user, { unreadNotifications }),
    });
  });

  /**
   * Update user profile information
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      firstName,
      lastName,
      bio,
      location,
      company,
      position,
      website,
      phone,
      socialLinks,
      timeZone,
      language,
      dateFormat,
    } = req.body;
    
    // Update user basic info
    const userUpdateData: Partial<User> = {};
    
    if (firstName !== undefined) userUpdateData.firstName = firstName;
    if (lastName !== undefined) userUpdateData.lastName = lastName;
    
    if (Object.keys(userUpdateData).length > 0) {
      userUpdateData.updatedAt = new Date();
      await this.userRepository.updateUser(userId, userUpdateData);
    }
    
    // Update or create profile
    const profileData: InsertUserProfile = {
      userId,
      updatedAt: new Date(),
    };
    
    if (bio !== undefined) profileData.bio = bio;
    if (location !== undefined) profileData.location = location;
    if (company !== undefined) profileData.company = company;
    if (position !== undefined) profileData.position = position;
    if (website !== undefined) profileData.website = website;
    if (phone !== undefined) profileData.phone = phone;
    if (socialLinks !== undefined) profileData.socialLinks = socialLinks;
    if (timeZone !== undefined) profileData.timeZone = timeZone;
    if (language !== undefined) profileData.language = language;
    if (dateFormat !== undefined) profileData.dateFormat = dateFormat;
    
    const userProfile = await this.userRepository.upsertUserProfile(profileData);
    
    // Log the activity
    await this.userRepository.createAuditLog({
      action: 'profile.update',
      userId,
      resourceType: 'profile',
      resourceId: String(userId),
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    const updatedUser = await this.userRepository.getUserById(userId);
    
    res.json({
      success: true,
      data: {
        user: this.sanitizeUserData(updatedUser!),
        profile: userProfile,
      },
      message: 'Profile updated successfully',
    });
  });

  /**
   * Change user password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current password and new password are required');
    }
    
    if (newPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters long');
    }
    
    const user = await this.userRepository.getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found', UserErrorCode.USER_NOT_FOUND);
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      throw new BadRequestError(
        'Current password is incorrect',
        UserErrorCode.INVALID_CREDENTIALS
      );
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      config.userService.bcryptSaltRounds
    );
    
    // Update password
    await this.userRepository.updateUser(userId, {
      password: hashedPassword,
      updatedAt: new Date(),
    });
    
    // Log the activity
    await this.userRepository.createAuditLog({
      action: 'password.change',
      userId,
      resourceType: 'user',
      resourceId: String(userId),
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    // Revoke all other sessions
    await this.userRepository.deleteUserSessions(userId, parseInt(req.body.keepCurrentSession));
    
    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  });

  /**
   * Delete user account
   */
  deleteAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { password } = req.body;
    
    if (!password) {
      throw new BadRequestError('Password is required to delete account');
    }
    
    const user = await this.userRepository.getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found', UserErrorCode.USER_NOT_FOUND);
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new BadRequestError(
        'Password is incorrect',
        UserErrorCode.INVALID_CREDENTIALS
      );
    }
    
    // Log the activity before deletion
    await this.userRepository.createAuditLog({
      action: 'account.delete',
      userId,
      resourceType: 'user',
      resourceId: String(userId),
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        email: user.email,
        username: user.username,
      },
    });
    
    // Delete user (this will cascade delete profiles, sessions, etc.)
    await this.userRepository.deleteUser(userId);
    
    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  });

  /**
   * Get user profile information
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    
    const user = await this.userRepository.getUserById(userId);
    const profile = await this.userRepository.getUserProfile(userId);
    
    if (!user) {
      throw new NotFoundError('User not found', UserErrorCode.USER_NOT_FOUND);
    }
    
    res.json({
      success: true,
      data: {
        user: this.sanitizeUserData(user),
        profile: profile || { userId },
      },
    });
  });

  /**
   * Get user notifications with pagination
   */
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const onlyUnread = req.query.unread === 'true';
    
    const notifications = await this.userRepository.getUserNotifications(
      userId,
      limit,
      offset,
      onlyUnread
    );
    
    const unreadCount = await this.userRepository.countUnreadNotifications(userId);
    
    res.json({
      success: true,
      data: notifications,
      meta: {
        unreadCount,
        limit,
        offset,
      },
    });
  });

  /**
   * Mark a notification as read
   */
  markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id);
    
    if (isNaN(notificationId)) {
      throw new BadRequestError('Invalid notification ID');
    }
    
    const notification = await this.userRepository.markNotificationAsRead(
      notificationId,
      userId
    );
    
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    
    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    });
  });

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    
    const count = await this.userRepository.markAllNotificationsAsRead(userId);
    
    res.json({
      success: true,
      data: { count },
      message: `${count} notifications marked as read`,
    });
  });

  /**
   * Delete a notification
   */
  deleteNotificationById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const notificationId = parseInt(req.params.id);
    
    if (isNaN(notificationId)) {
      throw new BadRequestError('Invalid notification ID');
    }
    
    const notification = await this.userRepository.deleteNotification(
      notificationId,
      userId
    );
    
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    
    res.json({
      success: true,
      message: 'Notification deleted',
    });
  });

  /**
   * Get user's active sessions
   */
  getSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    
    const sessions = await this.userRepository.getUserSessions(userId);
    
    // Format and sanitize session data
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceInfo: session.deviceInfo,
      isRevoked: session.isRevoked,
      isCurrent: session.token === req.token,
    }));
    
    res.json({
      success: true,
      data: formattedSessions,
    });
  });

  /**
   * Get user activity logs
   */
  getActivity = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const logs = await this.userRepository.getUserAuditLogs(userId, limit, offset);
    
    res.json({
      success: true,
      data: logs,
      meta: {
        limit,
        offset,
      },
    });
  });

  /**
   * Remove sensitive data from user objects and add extra data if needed
   */
  private sanitizeUserData(user: User, extraData: Record<string, any> = {}): Partial<User> & Record<string, any> {
    const {
      password,
      verificationToken,
      passwordResetToken,
      passwordResetExpires,
      twoFactorSecret,
      ...sanitizedUser
    } = user;
    
    return {
      ...sanitizedUser,
      ...extraData,
    };
  }
}