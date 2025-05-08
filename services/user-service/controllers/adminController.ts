/**
 * Admin Controller
 * 
 * Handles administrative operations for user management
 * Only accessible to users with admin or superadmin roles
 */
import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { User, InsertUser, UserErrorCode } from '../schema';
import { 
  NotFoundError, 
  BadRequestError, 
  ForbiddenError 
} from '../../../shared/errors/ApiError';
import { asyncHandler } from '../../../shared/middleware/errorHandler';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../db';
import bcrypt from 'bcrypt';
import { config } from '../../../shared/config';

export class AdminController {
  private userRepository: UserRepository;

  constructor() {
    const db = drizzle(pool);
    this.userRepository = new UserRepository(db);

    // Bind methods to this instance
    this.listUsers = this.listUsers.bind(this);
    this.getUserById = this.getUserById.bind(this);
    this.createUser = this.createUser.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
    this.changeUserRole = this.changeUserRole.bind(this);
    this.changeUserStatus = this.changeUserStatus.bind(this);
    this.getAuditLogs = this.getAuditLogs.bind(this);
    this.getSystemStats = this.getSystemStats.bind(this);
  }

  /**
   * Get a list of users with pagination and filtering
   */
  listUsers = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sortBy as keyof User) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';
    
    // Extract filters from query params
    const filters: Partial<User> = {};
    ['role', 'status', 'verified'].forEach((key) => {
      if (req.query[key]) {
        // @ts-ignore - Dynamic assignment
        filters[key] = req.query[key];
      }
    });

    // Search functionality
    if (req.query.search) {
      const searchResults = await this.userRepository.searchUsers(
        req.query.search as string,
        limit,
        offset
      );
      return res.json({
        success: true,
        data: searchResults,
        meta: {
          total: searchResults.length, // Pagination not accurate for search
          limit,
          offset,
        },
      });
    }

    // Regular listing with filters
    const users = await this.userRepository.listUsers(
      limit,
      offset,
      sortBy,
      sortOrder,
      filters
    );
    const count = await this.userRepository.countUsers(filters);

    res.json({
      success: true,
      data: users.map(this.sanitizeUserData),
      meta: {
        total: count,
        limit,
        offset,
      },
    });
  });

  /**
   * Get a user by ID
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }
    
    const user = await this.userRepository.getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found', UserErrorCode.USER_NOT_FOUND);
    }

    // Get user profile
    const profile = await this.userRepository.getUserProfile(userId);
    
    // Get user's sessions
    const sessions = await this.userRepository.getUserSessions(userId);
    
    // Get user's activity logs
    const activityLogs = await this.userRepository.getUserAuditLogs(userId, 10);
    
    res.json({
      success: true,
      data: {
        user: this.sanitizeUserData(user),
        profile,
        sessions: sessions.map(s => ({
          id: s.id,
          createdAt: s.createdAt,
          lastActivityAt: s.lastActivityAt,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          isRevoked: s.isRevoked,
        })),
        recentActivity: activityLogs,
      },
    });
  });

  /**
   * Create a new user (admin only)
   */
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, role, status } = req.body;
    
    // Check if email already exists
    const existingUser = await this.userRepository.getUserByEmail(email);
    
    if (existingUser) {
      throw new BadRequestError(
        'Email already in use',
        UserErrorCode.EMAIL_ALREADY_EXISTS
      );
    }
    
    // Check if requesting admin is trying to create a superadmin
    if (role === 'superadmin' && req.user?.role !== 'superadmin') {
      throw new ForbiddenError(
        'Only superadmins can create superadmin accounts',
        UserErrorCode.INSUFFICIENT_PERMISSIONS
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      config.userService.bcryptSaltRounds
    );
    
    // Create user
    const newUser = await this.userRepository.createUser({
      email,
      password: hashedPassword,
      firstName: firstName || null,
      lastName: lastName || null,
      role: role || 'user',
      status: status || 'active',
      verified: true, // Admin-created users are automatically verified
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Log activity
    await this.userRepository.createAuditLog({
      action: 'user.create',
      userId: req.user?.id,
      resourceType: 'user',
      resourceId: String(newUser.id),
      details: { 
        role: newUser.role,
        email: newUser.email,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    });
    
    res.status(201).json({
      success: true,
      data: this.sanitizeUserData(newUser),
      message: 'User created successfully',
    });
  });

  /**
   * Update a user
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }
    
    const user = await this.userRepository.getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found', UserErrorCode.USER_NOT_FOUND);
    }
    
    // Prevent non-superadmins from modifying superadmins
    if (
      user.role === 'superadmin' && 
      req.user?.role !== 'superadmin'
    ) {
      throw new ForbiddenError(
        'Only superadmins can modify superadmin accounts',
        UserErrorCode.INSUFFICIENT_PERMISSIONS
      );
    }
    
    const {
      firstName,
      lastName,
      email,
      status,
      password,
    } = req.body;
    
    // Check if email is being changed and if it's already in use
    if (email && email !== user.email) {
      const existingUser = await this.userRepository.getUserByEmail(email);
      if (existingUser) {
        throw new BadRequestError(
          'Email already in use',
          UserErrorCode.EMAIL_ALREADY_EXISTS
        );
      }
    }
    
    // Prepare update data
    const updateData: Partial<InsertUser> = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (status !== undefined) updateData.status = status;
    
    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(
        password,
        config.userService.bcryptSaltRounds
      );
    }
    
    // Update user
    const updatedUser = await this.userRepository.updateUser(userId, updateData);
    
    // Log activity
    await this.userRepository.createAuditLog({
      action: 'user.update',
      userId: req.user?.id,
      resourceType: 'user',
      resourceId: String(userId),
      details: {
        updatedFields: Object.keys(updateData),
        passwordChanged: !!password,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    });
    
    res.json({
      success: true,
      data: this.sanitizeUserData(updatedUser!),
      message: 'User updated successfully',
    });
  });

  /**
   * Delete a user
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      throw new BadRequestError('Invalid user ID');
    }
    
    const user = await this.userRepository.getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found', UserErrorCode.USER_NOT_FOUND);
    }
    
    // Prevent deleting superadmins
    if (
      user.role === 'superadmin' && 
      req.user?.role !== 'superadmin'
    ) {
      throw new ForbiddenError(
        'Only superadmins can delete superadmin accounts',
        UserErrorCode.INSUFFICIENT_PERMISSIONS
      );
    }
    
    // Delete user
    await this.userRepository.deleteUser(userId);
    
    // Log activity
    await this.userRepository.createAuditLog({
      action: 'user.delete',
      userId: req.user?.id,
      resourceType: 'user',
      resourceId: String(userId),
      details: {
        email: user.email,
        role: user.role,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    });
    
    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  });

  /**
   * Change a user's role (superadmin only)
   */
  changeUserRole = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
      throw new BadRequestError('Invalid role');
    }
    
    const user = await this.userRepository.getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found', UserErrorCode.USER_NOT_FOUND);
    }
    
    // Cannot modify your own role
    if (userId === req.user?.id) {
      throw new BadRequestError('Cannot modify your own role');
    }
    
    // Update user role
    const updatedUser = await this.userRepository.updateUser(userId, { role });
    
    // Log activity
    await this.userRepository.createAuditLog({
      action: 'user.change_role',
      userId: req.user?.id,
      resourceType: 'user',
      resourceId: String(userId),
      details: {
        previousRole: user.role,
        newRole: role,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    });
    
    res.json({
      success: true,
      data: this.sanitizeUserData(updatedUser!),
      message: `User role changed to ${role}`,
    });
  });

  /**
   * Change a user's status (activate, suspend, etc.)
   */
  changeUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || !['active', 'inactive', 'suspended', 'pending'].includes(status)) {
      throw new BadRequestError('Invalid status');
    }
    
    const user = await this.userRepository.getUserById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found', UserErrorCode.USER_NOT_FOUND);
    }
    
    // Cannot suspend yourself
    if (userId === req.user?.id) {
      throw new BadRequestError('Cannot change your own status');
    }
    
    // Update user status
    const updatedUser = await this.userRepository.updateUser(userId, { status });
    
    // Log activity
    await this.userRepository.createAuditLog({
      action: 'user.change_status',
      userId: req.user?.id,
      resourceType: 'user',
      resourceId: String(userId),
      details: {
        previousStatus: user.status,
        newStatus: status,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date(),
    });
    
    // If user was suspended, revoke all their sessions
    if (status === 'suspended') {
      await this.userRepository.deleteUserSessions(userId);
    }
    
    res.json({
      success: true,
      data: this.sanitizeUserData(updatedUser!),
      message: `User status changed to ${status}`,
    });
  });

  /**
   * Get audit logs with filtering
   */
  getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Extract filters
    const filters: Partial<any> = {};
    
    if (req.query.userId) {
      filters.userId = parseInt(req.query.userId as string);
    }
    
    if (req.query.action) {
      filters.action = req.query.action;
    }
    
    if (req.query.resourceType) {
      filters.resourceType = req.query.resourceType;
    }
    
    // Date range filtering
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : null;
    const toDate = req.query.toDate ? new Date(req.query.toDate as string) : null;
    
    const logs = await this.userRepository.getAuditLogs(filters, limit, offset);
    
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
   * Get system stats for dashboard
   */
  getSystemStats = asyncHandler(async (req: Request, res: Response) => {
    // Count users by role
    const totalUsers = await this.userRepository.countUsers();
    const activeUsers = await this.userRepository.countUsers({ status: 'active' });
    const adminUsers = await this.userRepository.countUsers({ role: 'admin' });
    const superadminUsers = await this.userRepository.countUsers({ role: 'superadmin' });
    
    // Get recent audit logs
    const recentLogs = await this.userRepository.getAuditLogs({}, 10);
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          admin: adminUsers,
          superadmin: superadminUsers,
          inactive: totalUsers - activeUsers,
        },
        recentActivity: recentLogs,
      },
    });
  });

  /**
   * Remove sensitive data from user objects
   */
  private sanitizeUserData(user: User): Partial<User> {
    const {
      password,
      verificationToken,
      passwordResetToken,
      passwordResetExpires,
      twoFactorSecret,
      ...sanitizedUser
    } = user;
    return sanitizedUser;
  }
}