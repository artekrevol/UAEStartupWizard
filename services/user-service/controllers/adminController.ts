/**
 * Admin Controller
 * 
 * Handles administrative operations for user management
 * Only accessible to users with admin or superadmin roles
 */
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { compare, hash } from 'bcrypt';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { config } from '../../../shared/config';
import { InsertUserSchema } from '../schema';
import userRepository from '../repositories/userRepository';
import { UserErrorCode, createUserError } from '../errors/userErrors';
import { asyncHandler } from '../../../shared/middleware/asyncHandler';

export class AdminController {
  /**
   * Get a list of users with pagination and filtering
   */
  listUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify admin access
      this.verifyAdminAccess(req);
      
      // Parse query parameters
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = (req.query.search as string) || undefined;
      const role = (req.query.role as string) || undefined;
      const status = (req.query.status as string) || undefined;
      
      // Get users
      const { users, total } = await userRepository.listUsers(
        limit,
        offset,
        search,
        role,
        status
      );
      
      // Sanitize user data
      const sanitizedUsers = users.map(user => this.sanitizeUserData(user));
      
      res.json({
        success: true,
        users: sanitizedUsers,
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

  /**
   * Get a user by ID
   */
  getUserById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify admin access
      this.verifyAdminAccess(req);
      
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid user ID',
          400
        );
      }
      
      // Get user
      const user = await userRepository.findUserById(userId);
      
      if (!user) {
        throw createUserError(UserErrorCode.USER_NOT_FOUND);
      }
      
      // Get profile
      const profile = await userRepository.findProfileByUserId(userId);
      
      // Get sessions
      const sessions = await userRepository.findSessionsByUserId(userId);
      const activeSessions = sessions.filter(s => !s.isRevoked && s.expiresAt > new Date());
      
      // Sanitize user data
      const userData = {
        ...this.sanitizeUserData(user),
        profile: profile || null,
        activeSessionsCount: activeSessions.length,
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
   * Create a new user (admin only)
   */
  createUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify admin access
      this.verifyAdminAccess(req);
      
      // Validate input
      try {
        InsertUserSchema.parse(req.body);
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
      
      // Check if username or email already exists
      const existingUsername = await userRepository.findUserByUsername(req.body.username);
      if (existingUsername) {
        throw createUserError(UserErrorCode.USERNAME_ALREADY_EXISTS);
      }
      
      const existingEmail = await userRepository.findUserByEmail(req.body.email);
      if (existingEmail) {
        throw createUserError(UserErrorCode.EMAIL_ALREADY_EXISTS);
      }
      
      // Make sure only superadmins can create other admins
      if (
        (req.body.role === 'admin' || req.body.role === 'superadmin') && 
        (req.user as JwtPayload).role !== 'superadmin'
      ) {
        throw createUserError(UserErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      
      // Hash password
      const hashedPassword = await hash(
        req.body.password,
        config.userService.bcryptSaltRounds
      );
      
      // Create user
      const newUser = await userRepository.createUser({
        ...req.body,
        password: hashedPassword,
        // Default values if not provided
        verified: req.body.verified ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Create empty profile
      await userRepository.createProfile({
        userId: newUser.id,
      });
      
      // Log the action
      await userRepository.createAuditLog({
        userId: (req.user as JwtPayload).sub as number,
        action: 'admin.user.create',
        resourceType: 'user',
        resourceId: newUser.id.toString(),
        details: {
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          ip: req.ip,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.status(201).json({
        success: true,
        user: this.sanitizeUserData(newUser),
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Update a user
   */
  updateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify admin access
      this.verifyAdminAccess(req);
      
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid user ID',
          400
        );
      }
      
      // Get user
      const user = await userRepository.findUserById(userId);
      
      if (!user) {
        throw createUserError(UserErrorCode.USER_NOT_FOUND);
      }
      
      // Validate input
      try {
        InsertUserSchema.partial().parse(req.body);
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
      
      // Protect superadmin accounts
      if (
        user.role === 'superadmin' && 
        (req.user as JwtPayload).role !== 'superadmin'
      ) {
        throw createUserError(UserErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      
      // Prevent self-role-demotion for admins
      if (
        (req.user as JwtPayload).sub === userId &&
        req.body.role &&
        req.body.role !== user.role
      ) {
        throw createUserError(UserErrorCode.SELF_MODIFICATION_FORBIDDEN);
      }
      
      // Only superadmins can promote to admin or superadmin
      if (
        req.body.role &&
        (req.body.role === 'admin' || req.body.role === 'superadmin') && 
        (req.user as JwtPayload).role !== 'superadmin'
      ) {
        throw createUserError(UserErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      
      // Prepare update data
      const updateData: any = {
        ...req.body,
        updatedAt: new Date(),
      };
      
      // Hash password if provided
      if (req.body.password) {
        updateData.password = await hash(
          req.body.password,
          config.userService.bcryptSaltRounds
        );
      }
      
      // Update user
      const updatedUser = await userRepository.updateUser(userId, updateData);
      
      // Log the action
      await userRepository.createAuditLog({
        userId: (req.user as JwtPayload).sub as number,
        action: 'admin.user.update',
        resourceType: 'user',
        resourceId: userId.toString(),
        details: {
          fields: Object.keys(req.body),
          ip: req.ip,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({
        success: true,
        user: this.sanitizeUserData(updatedUser!),
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Delete a user
   */
  deleteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify admin access
      this.verifyAdminAccess(req);
      
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid user ID',
          400
        );
      }
      
      // Get user
      const user = await userRepository.findUserById(userId);
      
      if (!user) {
        throw createUserError(UserErrorCode.USER_NOT_FOUND);
      }
      
      // Protect superadmin accounts
      if (
        user.role === 'superadmin' && 
        (req.user as JwtPayload).role !== 'superadmin'
      ) {
        throw createUserError(UserErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      
      // Prevent self-deletion
      if ((req.user as JwtPayload).sub === userId) {
        throw createUserError(UserErrorCode.SELF_MODIFICATION_FORBIDDEN);
      }
      
      // Create audit log first (before user is deleted)
      await userRepository.createAuditLog({
        userId: (req.user as JwtPayload).sub as number,
        action: 'admin.user.delete',
        resourceType: 'user',
        resourceId: userId.toString(),
        details: {
          username: user.username,
          email: user.email,
          ip: req.ip,
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
        message: 'User successfully deleted',
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Change a user's role (superadmin only)
   */
  changeUserRole = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify superadmin access
      if (!req.user || (req.user as JwtPayload).role !== 'superadmin') {
        throw createUserError(UserErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (isNaN(userId)) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid user ID',
          400
        );
      }
      
      if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid role. Must be one of: user, admin, superadmin',
          400
        );
      }
      
      // Get user
      const user = await userRepository.findUserById(userId);
      
      if (!user) {
        throw createUserError(UserErrorCode.USER_NOT_FOUND);
      }
      
      // Prevent self-demotion
      if ((req.user as JwtPayload).sub === userId && role !== user.role) {
        throw createUserError(UserErrorCode.SELF_MODIFICATION_FORBIDDEN);
      }
      
      // Update user's role
      const updatedUser = await userRepository.updateUser(userId, {
        role,
        updatedAt: new Date(),
      });
      
      // Log the action
      await userRepository.createAuditLog({
        userId: (req.user as JwtPayload).sub as number,
        action: 'admin.user.change_role',
        resourceType: 'user',
        resourceId: userId.toString(),
        details: {
          previousRole: user.role,
          newRole: role,
          ip: req.ip,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({
        success: true,
        user: this.sanitizeUserData(updatedUser!),
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Change a user's status (activate, suspend, etc.)
   */
  changeUserStatus = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify admin access
      this.verifyAdminAccess(req);
      
      const userId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(userId)) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid user ID',
          400
        );
      }
      
      if (!status || !['active', 'inactive', 'suspended', 'pending'].includes(status)) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid status. Must be one of: active, inactive, suspended, pending',
          400
        );
      }
      
      // Get user
      const user = await userRepository.findUserById(userId);
      
      if (!user) {
        throw createUserError(UserErrorCode.USER_NOT_FOUND);
      }
      
      // Protect superadmin accounts
      if (
        user.role === 'superadmin' && 
        (req.user as JwtPayload).role !== 'superadmin'
      ) {
        throw createUserError(UserErrorCode.INSUFFICIENT_PERMISSIONS);
      }
      
      // Prevent self-suspension/deactivation
      if (
        (req.user as JwtPayload).sub === userId && 
        status !== 'active' && 
        status !== user.status
      ) {
        throw createUserError(UserErrorCode.SELF_MODIFICATION_FORBIDDEN);
      }
      
      // Update user's status
      const updatedUser = await userRepository.updateUser(userId, {
        status,
        updatedAt: new Date(),
      });
      
      // Revoke all sessions if the user is being suspended or deactivated
      if (status === 'suspended' || status === 'inactive') {
        await userRepository.deleteUserSessions(userId);
      }
      
      // Log the action
      await userRepository.createAuditLog({
        userId: (req.user as JwtPayload).sub as number,
        action: 'admin.user.change_status',
        resourceType: 'user',
        resourceId: userId.toString(),
        details: {
          previousStatus: user.status,
          newStatus: status,
          ip: req.ip,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({
        success: true,
        user: this.sanitizeUserData(updatedUser!),
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Get audit logs with filtering
   */
  getAuditLogs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify admin access
      this.verifyAdminAccess(req);
      
      // Parse query parameters
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const action = req.query.action as string || undefined;
      const resourceType = req.query.resourceType as string || undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      // Validate date parameters
      if (startDate && isNaN(startDate.getTime())) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid startDate format',
          400
        );
      }
      
      if (endDate && isNaN(endDate.getTime())) {
        throw createUserError(
          UserErrorCode.INVALID_INPUT,
          'Invalid endDate format',
          400
        );
      }
      
      // Get audit logs
      const { logs, total } = await userRepository.findAuditLogs(
        limit,
        offset,
        userId,
        action,
        resourceType,
        startDate,
        endDate
      );
      
      res.json({
        success: true,
        logs,
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

  /**
   * Get system stats for dashboard
   */
  getSystemStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify admin access
      this.verifyAdminAccess(req);
      
      // This is a placeholder for actual stats gathering
      // In a real implementation, you'd have more detailed metrics
      
      // Get total users by role
      const { users: allUsers, total: totalUsers } = await userRepository.listUsers(1, 0);
      
      // Get user counts by status
      const activeUsers = await userRepository.listUsers(1, 0, undefined, undefined, 'active');
      const inactiveUsers = await userRepository.listUsers(1, 0, undefined, undefined, 'inactive');
      const suspendedUsers = await userRepository.listUsers(1, 0, undefined, undefined, 'suspended');
      
      // Get recent audit logs
      const { logs: recentLogs } = await userRepository.findAuditLogs(
        5, // Just get the 5 most recent logs
        0,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
      
      res.json({
        success: true,
        stats: {
          users: {
            total: totalUsers,
            active: activeUsers.total,
            inactive: inactiveUsers.total,
            suspended: suspendedUsers.total,
          },
          // Add other stats as needed
        },
        recentActivity: recentLogs,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Verify that the user has admin or superadmin role
   */
  private verifyAdminAccess(req: Request): void {
    if (!req.user) {
      throw createUserError(UserErrorCode.INVALID_TOKEN);
    }
    
    const role = (req.user as JwtPayload).role;
    
    if (role !== 'admin' && role !== 'superadmin') {
      throw createUserError(UserErrorCode.INSUFFICIENT_PERMISSIONS);
    }
  }

  /**
   * Remove sensitive data from user objects
   */
  private sanitizeUserData(user: any): Partial<any> {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      verified: user.verified,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export default new AdminController();