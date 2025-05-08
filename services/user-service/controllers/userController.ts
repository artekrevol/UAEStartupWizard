/**
 * User Controller
 * 
 * Handles user management operations
 */
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
import bcrypt from 'bcrypt';
import { config } from '../../../shared/config';

// Initialize repository
const userRepo = new UserRepository();

export class UserController {
  /**
   * Get current user (from JWT)
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
    
    // Return combined data
    res.json({
      status: 'success',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        profilePictureUrl: user.profilePictureUrl,
        company: user.company,
        position: user.position,
        phone: user.phone,
        address: user.address,
        newsletterSubscribed: user.newsletterSubscribed,
        preferences: user.preferences,
        verified: user.verified,
        profile: profile || null
      }
    });
  });

  /**
   * Get public user profile
   */
  getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    
    if (isNaN(userId)) {
      throw new ValidationException('Invalid user ID');
    }
    
    // Get user
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Get user profile
    const profile = await userRepo.getUserProfile(userId);
    
    // Return public data only
    res.json({
      status: 'success',
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        position: user.position,
        profilePictureUrl: user.profilePictureUrl,
        profile: profile ? {
          bio: profile.bio,
          country: profile.country,
          websiteUrl: profile.websiteUrl,
          industry: profile.industry
        } : null
      }
    });
  });

  /**
   * Update user profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const profileData = req.body;
    
    // Get user
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Get current profile
    const existingProfile = await userRepo.getUserProfile(userId);
    
    if (existingProfile) {
      // Update existing profile
      await userRepo.updateUserProfile(userId, {
        ...profileData,
        updatedAt: new Date()
      });
    } else {
      // Create new profile
      await userRepo.createUserProfile({
        userId,
        ...profileData
      });
    }
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'PROFILE_UPDATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Get updated profile
    const updatedProfile = await userRepo.getUserProfile(userId);
    
    res.json({
      status: 'success',
      data: updatedProfile
    });
  });

  /**
   * Update user account
   */
  updateAccount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { firstName, lastName, company, position, phone, address } = req.body;
    
    // Get user
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
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'ACCOUNT_UPDATED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Get updated user
    const updatedUser = await userRepo.getUser(userId);
    
    res.json({
      status: 'success',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        company: updatedUser.company,
        position: updatedUser.position,
        phone: updatedUser.phone,
        address: updatedUser.address
      }
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
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      status: 'success',
      data: updatedPreferences
    });
  });

  /**
   * Get user notifications
   */
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const includeRead = req.query.includeRead === 'true';
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    
    // Get notifications
    const notifications = await userRepo.getUserNotifications(
      userId,
      includeRead,
      limit,
      offset
    );
    
    res.json({
      status: 'success',
      data: notifications
    });
  });

  /**
   * Mark notification as read
   */
  markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const notificationId = parseInt(req.params.id, 10);
    
    if (isNaN(notificationId)) {
      throw new ValidationException('Invalid notification ID');
    }
    
    // Mark notification as read
    await userRepo.markNotificationAsRead(notificationId, userId);
    
    res.json({
      status: 'success',
      message: 'Notification marked as read'
    });
  });

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead = asyncHandler(async (req: Request, res: Response) => {
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
   * ADMIN: Get all users
   */
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'id',
      sortOrder = 'asc',
      role,
      status,
      search
    } = req.query;
    
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
    const count = await userRepo.countUsers(filters);
    
    res.json({
      status: 'success',
      data: {
        users,
        count,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10)
      }
    });
  });

  /**
   * ADMIN: Get user by ID
   */
  getUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    
    if (isNaN(userId)) {
      throw new ValidationException('Invalid user ID');
    }
    
    // Get user
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Get user profile
    const profile = await userRepo.getUserProfile(userId);
    
    res.json({
      status: 'success',
      data: {
        ...user,
        profile: profile || null
      }
    });
  });

  /**
   * ADMIN: Create user
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role, status, ...profileData } = req.body;
    
    if (!email || !password) {
      throw new ValidationException('Email and password are required');
    }
    
    // Check if user already exists
    const existingUser = await userRepo.getUserByEmail(email);
    
    if (existingUser) {
      throw new ServiceException(
        ErrorCode.USER_ALREADY_EXISTS,
        'A user with this email already exists'
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      config.userService.saltRounds
    );
    
    // Create user
    const user = await userRepo.createUser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'user',
      status: status || 'active',
      verified: true
    });
    
    // Create profile if profile data provided
    if (Object.keys(profileData).length > 0) {
      await userRepo.createUserProfile({
        userId: user.id,
        ...profileData
      });
    }
    
    // Log the action
    await userRepo.createAuditLog({
      userId: req.user.userId,
      action: 'USER_CREATED',
      resourceType: 'user',
      resourceId: user.id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Get complete user data
    const completeUser = await userRepo.getUser(user.id);
    const profile = await userRepo.getUserProfile(user.id);
    
    res.status(201).json({
      status: 'success',
      data: {
        ...completeUser,
        profile: profile || null
      }
    });
  });

  /**
   * ADMIN: Update user
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const { email, password, firstName, lastName, role, status, ...profileData } = req.body;
    
    if (isNaN(userId)) {
      throw new ValidationException('Invalid user ID');
    }
    
    // Check if user exists
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Prepare user update
    const userUpdate: Partial<User> = {};
    
    if (email) userUpdate.email = email;
    if (firstName) userUpdate.firstName = firstName;
    if (lastName) userUpdate.lastName = lastName;
    if (role) userUpdate.role = role;
    if (status) userUpdate.status = status;
    
    // Hash password if provided
    if (password) {
      userUpdate.password = await bcrypt.hash(
        password,
        config.userService.saltRounds
      );
    }
    
    // Update user
    if (Object.keys(userUpdate).length > 0) {
      await userRepo.updateUser(userId, {
        ...userUpdate,
        updatedAt: new Date()
      });
    }
    
    // Update profile if profile data provided
    if (Object.keys(profileData).length > 0) {
      await userRepo.updateUserProfile(userId, profileData);
    }
    
    // Log the action
    await userRepo.createAuditLog({
      userId: req.user.userId,
      action: 'USER_UPDATED',
      resourceType: 'user',
      resourceId: userId.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Get updated user data
    const updatedUser = await userRepo.getUser(userId);
    const profile = await userRepo.getUserProfile(userId);
    
    res.json({
      status: 'success',
      data: {
        ...updatedUser,
        profile: profile || null
      }
    });
  });

  /**
   * ADMIN: Delete user
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    
    if (isNaN(userId)) {
      throw new ValidationException('Invalid user ID');
    }
    
    // Check if user exists
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Delete user
    await userRepo.deleteUser(userId);
    
    // Publish user deleted event
    eventBus.publish('user-deleted', {
      userId,
      timestamp: new Date().toISOString()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId: req.user.userId,
      action: 'USER_DELETED',
      resourceType: 'user',
      resourceId: userId.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      status: 'success',
      message: `User ${userId} deleted successfully`
    });
  });
}