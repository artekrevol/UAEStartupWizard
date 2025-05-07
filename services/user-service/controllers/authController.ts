import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { UserRepository } from '../repositories/userRepository';
import { 
  registrationSchema, 
  loginSchema,
  type RegistrationData,
  type InsertUser
} from '../schema';
import { asyncHandler } from '../../../shared/middleware/errorHandler';
import { 
  ServiceException, 
  ErrorCode, 
  ValidationException 
} from '../../../shared/errors';
import { generateToken } from '../../../services/api-gateway/middleware/auth';
import { eventBus } from '../../../shared/event-bus';

// Initialize repository
const userRepo = new UserRepository();

// Helper for password hashing
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Helper for comparing passwords
const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Auth Controller
 * Handles user authentication, registration, and session management
 */
export class AuthController {
  /**
   * Register a new user
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = registrationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationException('Invalid registration data', {
        validationErrors: validationResult.error.errors
      });
    }
    
    const { email, password, confirmPassword, ...userData } = validationResult.data;
    
    // Check if user already exists
    const existingUser = await userRepo.getUserByEmail(email);
    
    if (existingUser) {
      throw new ServiceException(
        ErrorCode.CONFLICT,
        'User with this email already exists',
        undefined,
        409
      );
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Create user
    const user = await userRepo.createUser({
      email,
      password: hashedPassword,
      verificationToken,
      ...userData
    } as InsertUser);
    
    // Create initial user profile
    await userRepo.createUserProfile({
      userId: user.id
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId: user.id,
      action: 'REGISTER',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Publish user created event
    eventBus.publish('user-created', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });
    
    // Return user data (without sensitive information)
    const { password: _, verificationToken: __, resetPasswordToken: ___, ...safeUser } = user;
    
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: safeUser
    });
  });
  
  /**
   * Login user
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationException('Invalid login data', {
        validationErrors: validationResult.error.errors
      });
    }
    
    const { email, password } = validationResult.data;
    
    // Get user by email
    const user = await userRepo.getUserByEmail(email);
    
    // Check if user exists
    if (!user) {
      // Increment login attempts for security (even if user doesn't exist)
      await userRepo.incrementLoginAttempts(email);
      
      throw new ServiceException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        undefined,
        401
      );
    }
    
    // Check if account is locked
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Account is locked due to too many failed login attempts. Try again later.',
        undefined,
        401
      );
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Account is not active. Please contact support.',
        undefined,
        401
      );
    }
    
    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      const attempts = await userRepo.incrementLoginAttempts(email);
      
      // Log the failed login attempt
      await userRepo.createAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { attempts }
      });
      
      throw new ServiceException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password',
        undefined,
        401
      );
    }
    
    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    // Update user's refresh token
    await userRepo.updateUser(user.id, { refreshToken });
    
    // Update login info
    await userRepo.updateLoginInfo(user.id, req.ip, req.headers['user-agent']);
    
    // Create new session
    const session = await userRepo.createSession({
      userId: user.id,
      token: refreshToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      deviceInfo: {
        device: req.headers['user-agent']
      }
    });
    
    // Return user data and token
    const { password: _, resetPasswordToken: __, verificationToken: ___, ...safeUser } = user;
    
    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: safeUser,
        token,
        refreshToken: session.token
      }
    });
  });
  
  /**
   * Logout user
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    // Get refresh token from request
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ValidationException('Refresh token is required');
    }
    
    // Find session by token
    const session = await userRepo.getSessionByToken(refreshToken);
    
    if (session) {
      // Delete the session
      await userRepo.deleteSession(session.id);
      
      // Log the logout
      await userRepo.createAuditLog({
        userId: session.userId,
        action: 'LOGOUT',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
    
    res.json({
      status: 'success',
      message: 'Logout successful'
    });
  });
  
  /**
   * Refresh token
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // Get refresh token from request
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ValidationException('Refresh token is required');
    }
    
    // Find session by token
    const session = await userRepo.getSessionByToken(refreshToken);
    
    if (!session) {
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Invalid refresh token',
        undefined,
        401
      );
    }
    
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      // Delete expired session
      await userRepo.deleteSession(session.id);
      
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Refresh token has expired. Please login again.',
        undefined,
        401
      );
    }
    
    // Get user
    const user = await userRepo.getUser(session.userId);
    
    if (!user) {
      // Delete session if user doesn't exist
      await userRepo.deleteSession(session.id);
      
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'User not found',
        undefined,
        401
      );
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Account is not active. Please contact support.',
        undefined,
        401
      );
    }
    
    // Generate new JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });
    
    // Update session activity
    await userRepo.updateSessionActivity(session.id);
    
    // Return new token
    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        token
      }
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
    
    // Find user by verification token - using the repository instead of direct db access
    const users = await userRepo.getAllUsers(10, 0, 'id', 'asc', { verificationToken: token });
    const user = users.length > 0 ? users[0] : undefined;
    
    if (!user) {
      throw new ServiceException(
        ErrorCode.NOT_FOUND,
        'Invalid verification token',
        undefined,
        404
      );
    }
    
    // Mark user as verified
    await userRepo.updateUser(user.id, {
      verified: true,
      verificationToken: null
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId: user.id,
      action: 'EMAIL_VERIFIED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      status: 'success',
      message: 'Email verified successfully'
    });
  });
  
  /**
   * Forgot password
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    
    if (!email) {
      throw new ValidationException('Email is required');
    }
    
    // Find user by email
    const user = await userRepo.getUserByEmail(email);
    
    // For security reasons, always return success even if email doesn't exist
    if (!user) {
      return res.json({
        status: 'success',
        message: 'If your email exists in our system, you will receive a password reset link shortly'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set reset token expiration (1 hour)
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    
    // Update user with reset token
    await userRepo.updateUser(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpires
    });
    
    // Log the action
    await userRepo.createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // In a real application, send an email with the reset link
    // For this implementation, we'll just return the token in the response
    res.json({
      status: 'success',
      message: 'If your email exists in our system, you will receive a password reset link shortly',
      data: {
        // Only include this in development, remove in production
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      }
    });
  });
  
  /**
   * Reset password
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    if (!token) {
      throw new ValidationException('Reset token is required');
    }
    
    if (!password || !confirmPassword) {
      throw new ValidationException('Password and confirm password are required');
    }
    
    if (password !== confirmPassword) {
      throw new ValidationException('Passwords do not match');
    }
    
    if (password.length < 6) {
      throw new ValidationException('Password must be at least 6 characters');
    }
    
    // Find user by reset token - using the repository
    const users = await userRepo.getAllUsers(10, 0, 'id', 'asc', { resetPasswordToken: token });
    const user = users.length > 0 ? users[0] : undefined;
    
    if (!user) {
      throw new ServiceException(
        ErrorCode.NOT_FOUND,
        'Invalid reset token',
        undefined,
        404
      );
    }
    
    // Check if token is expired
    if (!user.resetPasswordExpires || new Date(user.resetPasswordExpires) < new Date()) {
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Reset token has expired. Please request a new one.',
        undefined,
        401
      );
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(password);
    
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
        'Session not found',
        undefined,
        404
      );
    }
    
    // Delete the session
    await userRepo.deleteSession(session.id);
    
    // Log the action
    await userRepo.createAuditLog({
      userId,
      action: 'SESSION_REVOKED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { sessionId }
    });
    
    res.json({
      status: 'success',
      message: 'Session revoked successfully'
    });
  });
  
  /**
   * Revoke all sessions except current
   */
  revokeAllSessions = asyncHandler(async (req: Request, res: Response) => {
    // Get user ID from authenticated user
    const userId = req.user.userId;
    
    // Get current session ID from request
    const { currentSessionId } = req.body;
    
    if (!currentSessionId) {
      throw new ValidationException('Current session ID is required');
    }
    
    // Delete all sessions except current
    await userRepo.deleteUserSessions(userId, parseInt(currentSessionId, 10));
    
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
   * Change password
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new ValidationException('Current password, new password, and confirm password are required');
    }
    
    if (newPassword !== confirmPassword) {
      throw new ValidationException('New passwords do not match');
    }
    
    if (newPassword.length < 6) {
      throw new ValidationException('New password must be at least 6 characters');
    }
    
    // Get user ID from authenticated user
    const userId = req.user.userId;
    
    // Get user
    const user = await userRepo.getUser(userId);
    
    if (!user) {
      throw new ServiceException(
        ErrorCode.NOT_FOUND,
        'User not found',
        undefined,
        404
      );
    }
    
    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    
    if (!isPasswordValid) {
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Current password is incorrect',
        undefined,
        401
      );
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update user with new password
    await userRepo.updateUser(userId, {
      password: hashedPassword
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