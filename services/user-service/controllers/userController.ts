import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import {
  type User,
  type UserProfile,
  type InsertUserProfile
} from '../schema';
import { asyncHandler } from '../../../shared/middleware/errorHandler';
import {
  ServiceException,
  ErrorCode,
  ValidationException,
  NotFoundException
} from '../../../shared/errors';
import { eventBus } from '../../../shared/event-bus';

// Initialize repository
const userRepo = new UserRepository();

/**
 * User Controller
 * Handles user management operations
 */
export class UserController {
  /**
   * Get current user profile
   */
  getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    
    // Get user
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Get user profile
    const profile = await userRepo.getUserProfile(userId);
    
    // Remove sensitive information
    const { password, resetPasswordToken, refreshToken, ...safeUser } = user;
    
    res.json({
      status: 'success',
      data: {
        user: safeUser,
        profile
      }
    });
  });
  
  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const profileData = req.body;
    
    // Validate profile data
    if (!profileData || Object.keys(profileData).length === 0) {
      throw new ValidationException('Profile data is required');
    }
    
    // Check if user exists
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Update user profile
    await userRepo.updateUserProfile(userId, profileData);
    
    // Get updated profile
    const updatedProfile = await userRepo.getUserProfile(userId);
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'PROFILE_UPDATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Publish event
    eventBus.publish('user-profile-updated', {
      userId,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  });
  
  /**
   * Update user account
   */
  updateAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { firstName, lastName, company, position, phone, address } = req.body;
    
    // Validate account data
    if (!firstName && !lastName && !company && !position && !phone && !address) {
      throw new ValidationException('At least one account field is required');
    }
    
    // Check if user exists
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Update user account
    await userRepo.updateUser(userId, {
      firstName,
      lastName,
      company,
      position,
      phone,
      address,
      updatedAt: new Date()
    });
    
    // Get updated user
    const updatedUser = await userRepo.getUser(userId);
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'ACCOUNT_UPDATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Publish event
    eventBus.publish('user-updated', {
      userId,
      timestamp: new Date().toISOString()
    });
    
    // Remove sensitive information
    const { password, resetPasswordToken, refreshToken, ...safeUser } = updatedUser;
    
    res.json({
      status: 'success',
      message: 'Account updated successfully',
      data: safeUser
    });
  });
  
  /**
   * Get user notifications
   */
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { includeRead = false, limit = 50, offset = 0 } = req.query;
    
    // Get notifications
    const notifications = await userRepo.getUserNotifications(
      userId,
      includeRead === 'true',
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );
    
    res.json({
      status: 'success',
      data: notifications
    });
  });
  
  /**
   * Mark notification as read
   */
  markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { notificationId } = req.params;
    
    if (!notificationId) {
      throw new ValidationException('Notification ID is required');
    }
    
    // Mark notification as read
    await userRepo.markNotificationAsRead(parseInt(notificationId, 10), userId);
    
    res.json({
      status: 'success',
      message: 'Notification marked as read'
    });
  });
  
  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    
    // Mark all notifications as read
    await userRepo.markAllNotificationsAsRead(userId);
    
    res.json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  });
  
  /**
   * Get audit logs
   */
  getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;
    
    // Get audit logs
    const auditLogs = await userRepo.getUserAuditLogs(
      userId,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );
    
    res.json({
      status: 'success',
      data: auditLogs
    });
  });
  
  /**
   * Update preferences
   */
  updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { preferences } = req.body;
    
    if (!preferences) {
      throw new ValidationException('Preferences are required');
    }
    
    // Check if user exists
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Merge existing preferences with new ones
    const updatedPreferences = {
      ...user.preferences,
      ...preferences
    };
    
    // Update user preferences
    await userRepo.updateUser(userId, {
      preferences: updatedPreferences,
      updatedAt: new Date()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'PREFERENCES_UPDATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { changes: preferences }
    });
    
    res.json({
      status: 'success',
      message: 'Preferences updated successfully',
      data: updatedPreferences
    });
  });
  
  /**
   * Toggle newsletter subscription
   */
  toggleNewsletter = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { subscribed } = req.body;
    
    if (subscribed === undefined) {
      throw new ValidationException('Subscription status is required');
    }
    
    // Check if user exists
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Update newsletter subscription
    await userRepo.updateUser(userId, {
      newsletterSubscribed: !!subscribed,
      updatedAt: new Date()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: subscribed ? 'NEWSLETTER_SUBSCRIBED' : 'NEWSLETTER_UNSUBSCRIBED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Publish event
    eventBus.publish('newsletter-preference-changed', {
      userId,
      subscribed: !!subscribed,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      status: 'success',
      message: subscribed
        ? 'Successfully subscribed to newsletter'
        : 'Successfully unsubscribed from newsletter'
    });
  });
  
  /**
   * Get all users (admin only)
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ServiceException(
        ErrorCode.FORBIDDEN,
        'You do not have permission to access this resource',
        undefined,
        403
      );
    }
    
    const {
      limit = 50,
      offset = 0,
      sortBy = 'id',
      sortOrder = 'asc',
      role,
      status,
      search
    } = req.query;
    
    // Build filters
    const filters: Record<string, any> = {};
    if (role) filters.role = role;
    if (status) filters.status = status;
    if (search) filters.search = search;
    
    // Get users
    const users = await userRepo.getAllUsers(
      parseInt(limit as string, 10),
      parseInt(offset as string, 10),
      sortBy as keyof User,
      sortOrder as 'asc' | 'desc',
      filters
    );
    
    // Get total count
    const totalCount = await userRepo.countUsers(filters);
    
    // Remove sensitive information
    const safeUsers = users.map(user => {
      const { password, resetPasswordToken, refreshToken, ...safeUser } = user;
      return safeUser;
    });
    
    res.json({
      status: 'success',
      data: {
        users: safeUsers,
        total: totalCount,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10)
      }
    });
  });
  
  /**
   * Update user status (admin only)
   */
  updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ServiceException(
        ErrorCode.FORBIDDEN,
        'You do not have permission to access this resource',
        undefined,
        403
      );
    }
    
    const { userId } = req.params;
    const { status } = req.body;
    
    if (!userId) {
      throw new ValidationException('User ID is required');
    }
    
    if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
      throw new ValidationException('Valid status is required (active, inactive, suspended)');
    }
    
    // Check if user exists
    const user = await userRepo.getUser(parseInt(userId, 10));
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Don't allow changing admin status unless current user is super-admin
    if (user.role === 'admin' && req.user.role !== 'super-admin') {
      throw new ServiceException(
        ErrorCode.FORBIDDEN,
        'You do not have permission to modify an admin user',
        undefined,
        403
      );
    }
    
    // Update user status
    await userRepo.updateUser(parseInt(userId, 10), {
      status,
      updatedAt: new Date()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId: req.user.userId,
      action: 'ADMIN_UPDATE_USER_STATUS',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { targetUserId: userId, status }
    });
    
    // Publish event
    eventBus.publish('user-status-changed', {
      userId: parseInt(userId, 10),
      status,
      changedBy: req.user.userId,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      status: 'success',
      message: `User status updated to ${status} successfully`
    });
  });
  
  /**
   * Get user by ID (admin only)
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ServiceException(
        ErrorCode.FORBIDDEN,
        'You do not have permission to access this resource',
        undefined,
        403
      );
    }
    
    const { userId } = req.params;
    
    if (!userId) {
      throw new ValidationException('User ID is required');
    }
    
    // Get user
    const user = await userRepo.getUser(parseInt(userId, 10));
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Get user profile
    const profile = await userRepo.getUserProfile(parseInt(userId, 10));
    
    // Get user sessions
    const sessions = await userRepo.getUserSessions(parseInt(userId, 10));
    
    // Remove sensitive information
    const { password, resetPasswordToken, refreshToken, ...safeUser } = user;
    
    res.json({
      status: 'success',
      data: {
        user: safeUser,
        profile,
        sessions: sessions.map(session => ({
          ...session,
          token: undefined // Don't expose session tokens
        }))
      }
    });
  });
  
  /**
   * Delete user (admin only)
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      throw new ServiceException(
        ErrorCode.FORBIDDEN,
        'You do not have permission to access this resource',
        undefined,
        403
      );
    }
    
    const { userId } = req.params;
    
    if (!userId) {
      throw new ValidationException('User ID is required');
    }
    
    const targetUserId = parseInt(userId, 10);
    
    // Check if user exists
    const user = await userRepo.getUser(targetUserId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Don't allow deleting admin users unless current user is super-admin
    if (user.role === 'admin' && req.user.role !== 'super-admin') {
      throw new ServiceException(
        ErrorCode.FORBIDDEN,
        'You do not have permission to delete an admin user',
        undefined,
        403
      );
    }
    
    // Don't allow deleting yourself
    if (targetUserId === req.user.userId) {
      throw new ServiceException(
        ErrorCode.CONFLICT,
        'You cannot delete your own account',
        undefined,
        409
      );
    }
    
    // Log the action before deletion
    await userRepo.createAuditLog({
      userId: req.user.userId,
      action: 'ADMIN_DELETE_USER',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { targetUserId, email: user.email }
    });
    
    // Publish event before deletion
    eventBus.publish('user-deleted', {
      userId: targetUserId,
      email: user.email,
      deletedBy: req.user.userId,
      timestamp: new Date().toISOString()
    });
    
    // Delete user sessions first
    await userRepo.deleteUserSessions(targetUserId);
    
    // Delete user
    await userRepo.deleteUser(targetUserId);
    
    res.json({
      status: 'success',
      message: 'User deleted successfully'
    });
  });
}