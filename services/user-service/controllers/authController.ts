/**
 * Authentication Controller
 * 
 * Handles user authentication and registration
 */
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/userRepository';
import { asyncHandler } from '../../../shared/middleware/errorHandler';
import {
  ServiceException,
  ErrorCode,
  ValidationException,
  NotFoundException
} from '../../../shared/errors';
import { config } from '../../../shared/config';
import { logger } from '../../../shared/logger';
import { eventBus } from '../../../shared/event-bus';

// Initialize repository
const userRepo = new UserRepository();

export class AuthController {
  /**
   * User login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new ValidationException('Email and password are required');
    }
    
    // Find user by email
    const user = await userRepo.getUserByEmail(email);
    
    if (!user) {
      throw new ServiceException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    }
    
    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new ServiceException(
        ErrorCode.ACCOUNT_LOCKED,
        'Account is temporarily locked. Please try again later.'
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await userRepo.incrementLoginAttempts(email);
      
      throw new ServiceException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    }
    
    // Update login info
    await userRepo.updateLoginInfo(user.id, req.ip, req.headers['user-agent']);
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.userService.jwtSecret,
      { expiresIn: config.userService.jwtExpiresIn }
    );
    
    // Create session
    const session = await userRepo.createSession({
      userId: user.id,
      token,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      deviceInfo: {}
    });
    
    // Publish user logged in event
    eventBus.publish('user-logged-in', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
    // Return user info and token
    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      }
    });
  });
  
  /**
   * User registration
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName } = req.body;
    
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
      role: 'user',
      status: 'active',
      verificationToken: uuidv4()
    });
    
    // Initialize user profile
    await userRepo.createUserProfile({
      userId: user.id
    });
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.userService.jwtSecret,
      { expiresIn: config.userService.jwtExpiresIn }
    );
    
    // Create session
    await userRepo.createSession({
      userId: user.id,
      token,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      deviceInfo: {}
    });
    
    // Publish user registered event
    eventBus.publish('user-registered', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
    // In a real app, we would send a verification email here
    logger.info(`Verification link would be sent to ${email} with token ${user.verificationToken}`);
    
    // Return user info and token
    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      }
    });
  });
  
  /**
   * User logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Find session by token
      const session = await userRepo.getSessionByToken(token);
      
      // Delete session if found
      if (session) {
        await userRepo.deleteSession(session.id);
        
        // Publish user logged out event
        eventBus.publish('user-logged-out', {
          userId: session.userId,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  });
  
  /**
   * Verify email
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    
    if (!token) {
      throw new ValidationException('Verification token is required');
    }
    
    // Find user by verification token
    const users = await userRepo.getAllUsers(1, 0, 'id', 'asc', {
      verificationToken: token
    });
    
    if (!users.length) {
      throw new ServiceException(
        ErrorCode.INVALID_TOKEN,
        'Invalid or expired verification token'
      );
    }
    
    const user = users[0];
    
    // Update user as verified
    await userRepo.updateUser(user.id, {
      verified: true,
      verificationToken: null
    });
    
    res.json({
      status: 'success',
      message: 'Email verified successfully. You can now log in.'
    });
  });
  
  /**
   * Request password reset
   */
  requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    
    if (!email) {
      throw new ValidationException('Email is required');
    }
    
    // Find user by email
    const user = await userRepo.getUserByEmail(email);
    
    if (user) {
      // Generate reset token
      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      // Update user with reset token
      await userRepo.updateUser(user.id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      });
      
      // In a real app, we would send a reset email here
      logger.info(`Password reset link would be sent to ${email} with token ${resetToken}`);
    }
    
    // Always return success to prevent email enumeration
    res.json({
      status: 'success',
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  });
  
  /**
   * Reset password with token
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!token || !password) {
      throw new ValidationException('Token and new password are required');
    }
    
    // Find user by reset token
    const users = await userRepo.getAllUsers(1, 0, 'id', 'asc', {
      resetPasswordToken: token
    });
    
    if (!users.length) {
      throw new ServiceException(
        ErrorCode.INVALID_TOKEN,
        'Invalid or expired reset token'
      );
    }
    
    const user = users[0];
    
    // Check if token is expired
    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      throw new ServiceException(
        ErrorCode.TOKEN_EXPIRED,
        'Reset token has expired'
      );
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(
      password,
      config.userService.saltRounds
    );
    
    // Update user with new password
    await userRepo.updateUser(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });
    
    // Delete all sessions for the user
    await userRepo.deleteUserSessions(user.id);
    
    // Log the action
    await userRepo.createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      status: 'success',
      message: 'Password reset successfully. Please login with your new password.'
    });
  });
  
  /**
   * Get all active sessions for a user
   */
  getSessions = asyncHandler(async (req: Request, res: Response) => {
    // Get user ID from authenticated user
    const userId = req.user.userId;
    
    // Get all sessions
    const sessions = await userRepo.getUserSessions(userId);
    
    res.json({
      status: 'success',
      data: sessions
    });
  });
  
  /**
   * Revoke a session
   */
  revokeSession = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      throw new ValidationException('Session ID is required');
    }
    
    // Get user ID from authenticated user
    const userId = req.user.userId;
    
    // Find session - using repository methods instead of direct db access
    const allSessions = await userRepo.getUserSessions(userId);
    const session = allSessions.find(s => s.id === parseInt(sessionId, 10));
    
    if (!session) {
      throw new ServiceException(
        ErrorCode.NOT_FOUND,
        'Session not found or does not belong to you'
      );
    }
    
    // Delete session
    await userRepo.deleteSession(session.id);
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'SESSION_REVOKED',
      resourceType: 'session',
      resourceId: sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      status: 'success',
      message: 'Session revoked successfully'
    });
  });
  
  /**
   * Revoke all sessions except current one
   */
  revokeAllSessions = asyncHandler(async (req: Request, res: Response) => {
    // Get user ID from authenticated user
    const userId = req.user.userId;
    
    // Get current session token
    const authHeader = req.headers.authorization;
    let currentSessionId: number | undefined;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const session = await userRepo.getSessionByToken(token);
      if (session) {
        currentSessionId = session.id;
      }
    }
    
    // Delete all sessions except current one
    await userRepo.deleteUserSessions(userId, currentSessionId);
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'ALL_SESSIONS_REVOKED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      status: 'success',
      message: 'All other sessions revoked successfully'
    });
  });
  
  /**
   * Change password (authenticated)
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      throw new ValidationException('Current password and new password are required');
    }
    
    // Get user ID from authenticated user
    const userId = req.user.userId;
    
    // Get user
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new NotFoundException('User', userId);
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      throw new ServiceException(
        ErrorCode.INVALID_CREDENTIALS,
        'Current password is incorrect'
      );
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      config.userService.saltRounds
    );
    
    // Update user with new password
    await userRepo.updateUser(userId, {
      password: hashedPassword,
      updatedAt: new Date()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'PASSWORD_CHANGED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });
  });
}