/**
 * Auth Controller
 * 
 * Handles authentication operations like login, registration, password reset, etc.
 */
import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { 
  UserCredentialsSchema, 
  UserRegistrationSchema,
  UserErrorCode
} from '../schema';
import { asyncHandler } from '../../../shared/middleware/errorHandler';
import { ServiceException, ErrorCode, ValidationException } from '../../../shared/errors';
import { eventBus } from '../../../shared/event-bus';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../../shared/config';
import { v4 as uuidv4 } from 'uuid';

// Initialize repository
const userRepo = new UserRepository();

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

export class AuthController {
  /**
   * User login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const credentials = UserCredentialsSchema.parse(req.body);
    
    // Get user
    const user = await userRepo.getUserByEmail(credentials.email);
    
    if (!user) {
      throw new ServiceException(
        UserErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    }
    
    // Check if account is locked
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      throw new ServiceException(
        UserErrorCode.ACCOUNT_LOCKED,
        'Account is temporarily locked. Try again later'
      );
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await userRepo.updateUser(user.id, {
        loginAttempts: (user.loginAttempts || 0) + 1,
        lockUntil: (user.loginAttempts || 0) >= 4 ? new Date(Date.now() + 30 * 60000) : null // Lock for 30 minutes after 5 attempts
      });
      
      throw new ServiceException(
        UserErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    }
    
    // Update login info
    await userRepo.updateUser(user.id, {
      lastLogin: new Date(),
      lastActive: new Date(),
      loginAttempts: 0,
      lockUntil: null
    });
    
    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Create session
    const sessionId = uuidv4();
    await userRepo.createUserSession({
      id: sessionId,
      userId: user.id,
      token,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Publish login event
    eventBus.publish('user-login', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    // Return user data and token
    res.json({
      status: 'success',
      data: {
        token,
        sessionId,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status
        }
      }
    });
  });

  /**
   * User registration
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const userData = UserRegistrationSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await userRepo.getUserByEmail(userData.email);
    
    if (existingUser) {
      throw new ServiceException(
        UserErrorCode.EMAIL_ALREADY_EXISTS,
        'Email is already registered'
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(
      userData.password,
      config.userService.saltRounds
    );
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Create user
    const user = await userRepo.createUser({
      ...userData,
      password: hashedPassword,
      verificationToken,
      status: 'pending',
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Create session
    const sessionId = uuidv4();
    await userRepo.createUserSession({
      id: sessionId,
      userId: user.id,
      token,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Publish registration event
    eventBus.publish('user-registered', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId: user.id,
      action: 'REGISTERED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    // Send welcome notification
    await userRepo.createNotification({
      userId: user.id,
      title: 'Welcome to UAE Business Setup',
      message: 'Thank you for registering! Please verify your email to get started.',
      type: 'welcome',
      createdAt: new Date()
    });
    
    // In a real implementation, we would send a verification email here
    // sendVerificationEmail(user.email, verificationToken);
    
    // Return user data and token
    res.status(201).json({
      status: 'success',
      data: {
        token,
        sessionId,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          verified: user.verified
        }
      }
    });
  });

  /**
   * User logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify and decode token
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      
      // Find session by token
      const session = await userRepo.getUserSessions(decoded.userId);
      
      if (session && session.length > 0) {
        // Delete session
        await userRepo.deleteUserSession(session[0].id, decoded.userId);
        
        // Publish logout event
        eventBus.publish('user-logout', {
          userId: decoded.userId,
          timestamp: new Date().toISOString()
        });
        
        // Log the action
        await userRepo.createAuditLog({
          userId: decoded.userId,
          action: 'LOGOUT',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date()
        });
      }
    } catch (error) {
      // Token invalid or expired, that's fine for logout
    }
    
    res.status(200).json({
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
    const user = await userRepo.getUserByVerificationToken(token);
    
    if (!user) {
      throw new ValidationException('Invalid or expired verification token');
    }
    
    // Update user
    await userRepo.updateUser(user.id, {
      verified: true,
      status: 'active',
      verificationToken: null,
      updatedAt: new Date()
    });
    
    // Publish event
    eventBus.publish('user-verified', {
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId: user.id,
      action: 'EMAIL_VERIFIED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    // Send notification
    await userRepo.createNotification({
      userId: user.id,
      title: 'Email Verified',
      message: 'Your email has been successfully verified. You now have full access to all features.',
      type: 'account',
      createdAt: new Date()
    });
    
    res.json({
      status: 'success',
      message: 'Email verified successfully'
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
    
    if (!user) {
      // We don't want to reveal if the email exists for security reasons
      return res.json({
        status: 'success',
        message: 'Password reset instructions have been sent to your email if it exists in our system'
      });
    }
    
    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Update user
    await userRepo.updateUser(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
      updatedAt: new Date()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    // In a real implementation, we would send a password reset email here
    // sendPasswordResetEmail(user.email, resetToken);
    
    res.json({
      status: 'success',
      message: 'Password reset instructions have been sent to your email if it exists in our system'
    });
  });

  /**
   * Reset password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!token || !password) {
      throw new ValidationException('Reset token and new password are required');
    }
    
    if (password.length < 8) {
      throw new ValidationException('Password must be at least 8 characters long');
    }
    
    // Find user by reset token
    const user = await userRepo.getUserByResetToken(token);
    
    if (!user) {
      throw new ValidationException('Invalid or expired reset token');
    }
    
    // Check if token is expired
    if (!user.passwordResetExpires || new Date(user.passwordResetExpires) < new Date()) {
      throw new ValidationException('Reset token has expired');
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(
      password,
      config.userService.saltRounds
    );
    
    // Update user
    await userRepo.updateUser(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      updatedAt: new Date()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    // Send notification
    await userRepo.createNotification({
      userId: user.id,
      title: 'Password Reset',
      message: 'Your password has been successfully reset. If you did not perform this action, please contact support immediately.',
      type: 'security',
      createdAt: new Date()
    });
    
    res.json({
      status: 'success',
      message: 'Password has been reset successfully'
    });
  });

  /**
   * Get user sessions
   */
  getSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    
    // Get sessions
    const sessions = await userRepo.getUserSessions(userId);
    
    res.json({
      status: 'success',
      data: sessions
    });
  });

  /**
   * Revoke session
   */
  revokeSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { sessionId } = req.params;
    
    if (!sessionId) {
      throw new ValidationException('Session ID is required');
    }
    
    // Get current session token
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const sessions = await userRepo.getUserSessions(userId);
      
      // If trying to revoke current session, logout
      const isCurrentSession = sessions.some(s => s.id === sessionId && s.token === token);
      
      if (isCurrentSession) {
        await userRepo.deleteUserSession(sessionId, userId);
        
        // Publish logout event
        eventBus.publish('user-logout', {
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.json({
          status: 'success',
          message: 'Your current session has been revoked. You will be logged out.'
        });
      }
    }
    
    // Revoke the session
    await userRepo.deleteUserSession(sessionId, userId);
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'SESSION_REVOKED',
      resourceType: 'session',
      resourceId: sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    res.json({
      status: 'success',
      message: 'Session has been revoked successfully'
    });
  });

  /**
   * Revoke all sessions
   */
  revokeAllSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    
    // Delete all sessions
    await userRepo.deleteAllUserSessions(userId);
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'ALL_SESSIONS_REVOKED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    // Publish logout event
    eventBus.publish('user-logout', {
      userId,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      status: 'success',
      message: 'All sessions have been revoked. You will be logged out.'
    });
  });

  /**
   * Change password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      throw new ValidationException('Current password and new password are required');
    }
    
    if (newPassword.length < 8) {
      throw new ValidationException('New password must be at least 8 characters long');
    }
    
    // Get user
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new ServiceException(
        UserErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials'
      );
    }
    
    // Check current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      throw new ServiceException(
        UserErrorCode.INVALID_CREDENTIALS,
        'Current password is incorrect'
      );
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      config.userService.saltRounds
    );
    
    // Update user
    await userRepo.updateUser(userId, {
      password: hashedPassword,
      updatedAt: new Date()
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'PASSWORD_CHANGED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    });
    
    // Send notification
    await userRepo.createNotification({
      userId,
      title: 'Password Changed',
      message: 'Your password has been successfully changed. If you did not perform this action, please contact support immediately.',
      type: 'security',
      createdAt: new Date()
    });
    
    res.json({
      status: 'success',
      message: 'Password has been changed successfully'
    });
  });
}