/**
 * Authentication Controller
 * 
 * Handles user authentication, registration, and session management
 */
import { Request, Response, NextFunction } from 'express';
import { compare, hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createId } from '@paralleldrive/cuid2';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { config } from '../../../shared/config';
import { UserCredentialsSchema, UserRegistrationSchema } from '../schema';
import userRepository from '../repositories/userRepository';
import { UserErrorCode, createUserError } from '../errors/userErrors';
import { asyncHandler } from '../../../shared/middleware/asyncHandler';

export class AuthController {
  /**
   * Login a user and return a JWT token
   */
  login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate input
      const validatedInput = UserCredentialsSchema.parse(req.body);
      const { username, password } = validatedInput;
      
      // Find user
      const user = await userRepository.findUserByUsername(username);
      
      if (!user) {
        throw createUserError(UserErrorCode.INVALID_CREDENTIALS);
      }
      
      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw createUserError(UserErrorCode.ACCOUNT_LOCKED);
      }
      
      // Check account status
      if (user.status === 'suspended') {
        throw createUserError(UserErrorCode.ACCOUNT_SUSPENDED);
      }
      
      if (user.status === 'inactive') {
        throw createUserError(UserErrorCode.ACCOUNT_INACTIVE);
      }
      
      // Verify password
      const passwordMatches = await compare(password, user.password);
      
      if (!passwordMatches) {
        // Increment failed login attempts
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        
        const updateData: any = {
          failedLoginAttempts: failedAttempts
        };
        
        // Lock account after 5 failed attempts
        if (failedAttempts >= 5) {
          // Lock for 15 minutes
          const lockUntil = new Date();
          lockUntil.setMinutes(lockUntil.getMinutes() + 15);
          updateData.lockedUntil = lockUntil;
        }
        
        await userRepository.updateUser(user.id, updateData);
        throw createUserError(UserErrorCode.INVALID_CREDENTIALS);
      }
      
      // Reset failed login attempts and update last login
      await userRepository.updateUser(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      });
      
      // Generate JWT token
      const payload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };
      
      const token = jwt.sign(payload, config.userService.jwtSecret, {
        expiresIn: config.userService.jwtExpiresIn,
      });
      
      // Generate refresh token
      const refreshToken = createId();
      const expiresAt = new Date();
      expiresAt.setMilliseconds(
        expiresAt.getMilliseconds() + config.userService.refreshTokenExpiresIn
      );
      
      // Create session record
      await userRepository.createSession({
        userId: user.id,
        token,
        refreshToken,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceInfo: {},
        lastActivityAt: new Date(),
      });
      
      // Log the login
      await userRepository.createAuditLog({
        userId: user.id,
        action: 'user.login',
        details: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      // Return response
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
        },
        token,
        refreshToken,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        next(createUserError(
          UserErrorCode.INVALID_INPUT,
          validationError.message,
          400
        ));
      } else {
        next(err);
      }
    }
  });

  /**
   * Register a new user
   */
  register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate input
      const validatedInput = UserRegistrationSchema.parse(req.body);
      
      // Check if username already exists
      const existingUsername = await userRepository.findUserByUsername(validatedInput.username);
      if (existingUsername) {
        throw createUserError(UserErrorCode.USERNAME_ALREADY_EXISTS);
      }
      
      // Check if email already exists
      const existingEmail = await userRepository.findUserByEmail(validatedInput.email);
      if (existingEmail) {
        throw createUserError(UserErrorCode.EMAIL_ALREADY_EXISTS);
      }
      
      // Hash password
      const hashedPassword = await hash(
        validatedInput.password,
        config.userService.bcryptSaltRounds
      );
      
      // Create user
      const newUser = await userRepository.createUser({
        ...validatedInput,
        password: hashedPassword,
        verificationToken: createId(),
        role: 'user', // Default role
        status: 'active', // Default status
        verified: false,
      });
      
      // Generate JWT token
      const payload = {
        sub: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      };
      
      const token = jwt.sign(payload, config.userService.jwtSecret, {
        expiresIn: config.userService.jwtExpiresIn,
      });
      
      // Generate refresh token
      const refreshToken = createId();
      const expiresAt = new Date();
      expiresAt.setMilliseconds(
        expiresAt.getMilliseconds() + config.userService.refreshTokenExpiresIn
      );
      
      // Create session record
      await userRepository.createSession({
        userId: newUser.id,
        token,
        refreshToken,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceInfo: {},
        lastActivityAt: new Date(),
      });
      
      // Create empty profile for user
      await userRepository.createProfile({
        userId: newUser.id,
      });
      
      // Create welcome notification
      await userRepository.createNotification({
        userId: newUser.id,
        type: 'system',
        title: 'Welcome to the platform!',
        message: 'Thank you for registering. Get started by completing your profile.',
        isRead: false,
      });
      
      // Log the registration
      await userRepository.createAuditLog({
        userId: newUser.id,
        action: 'user.register',
        details: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      // Return response
      res.status(201).json({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          status: newUser.status,
        },
        token,
        refreshToken,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        next(createUserError(
          UserErrorCode.INVALID_INPUT,
          validationError.message,
          400
        ));
      } else {
        next(err);
      }
    }
  });

  /**
   * Logout current user
   */
  logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Revoke the session
        await userRepository.revokeSession(token);
        
        // Log the logout
        if (req.user && req.user.id) {
          await userRepository.createAuditLog({
            userId: req.user.id,
            action: 'user.logout',
            details: {
              ip: req.ip,
              userAgent: req.headers['user-agent'],
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
        }
      }
      
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Refresh expired JWT token using refresh token
   */
  refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw createUserError(
          UserErrorCode.MISSING_REQUIRED_FIELDS,
          'Refresh token is required',
          400
        );
      }
      
      // Find the session by token
      const session = await userRepository.findSessionByToken(refreshToken);
      
      if (!session || session.isRevoked) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      // Get the user
      const user = await userRepository.findUserById(session.userId);
      
      if (!user) {
        throw createUserError(UserErrorCode.USER_NOT_FOUND);
      }
      
      if (user.status !== 'active') {
        throw createUserError(UserErrorCode.ACCOUNT_INACTIVE);
      }
      
      // Generate new JWT token
      const payload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };
      
      const newToken = jwt.sign(payload, config.userService.jwtSecret, {
        expiresIn: config.userService.jwtExpiresIn,
      });
      
      // Generate new refresh token
      const newRefreshToken = createId();
      const expiresAt = new Date();
      expiresAt.setMilliseconds(
        expiresAt.getMilliseconds() + config.userService.refreshTokenExpiresIn
      );
      
      // Revoke old session
      await userRepository.revokeSession(session.token);
      
      // Create new session
      await userRepository.createSession({
        userId: user.id,
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceInfo: session.deviceInfo,
        lastActivityAt: new Date(),
      });
      
      // Return new tokens
      res.json({
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Request password reset
   */
  requestPasswordReset = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        throw createUserError(
          UserErrorCode.MISSING_REQUIRED_FIELDS,
          'Email is required',
          400
        );
      }
      
      // Find user by email
      const user = await userRepository.findUserByEmail(email);
      
      // Don't reveal if the user exists or not for security reasons
      if (!user) {
        return res.json({
          success: true,
          message: 'If your email is registered, you will receive password reset instructions shortly',
        });
      }
      
      // Generate reset token
      const resetToken = createId();
      const resetExpires = new Date();
      resetExpires.setHours(
        resetExpires.getHours() + config.userService.passwordResetExpiresIn
      );
      
      // Update user with reset token
      await userRepository.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });
      
      // Log the password reset request
      await userRepository.createAuditLog({
        userId: user.id,
        action: 'user.password.reset_request',
        details: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      // In a real application, send email with reset link
      // For now, just return the token in the response (for testing)
      
      res.json({
        success: true,
        message: 'If your email is registered, you will receive password reset instructions shortly',
        // Include token for testing purposes
        resetToken,
        resetExpires,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Reset password using token
   */
  resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password, confirmPassword } = req.body;
      
      if (!token || !password || !confirmPassword) {
        throw createUserError(
          UserErrorCode.MISSING_REQUIRED_FIELDS,
          'Token, password and confirmPassword are required',
          400
        );
      }
      
      if (password !== confirmPassword) {
        throw createUserError(UserErrorCode.PASSWORD_MISMATCH);
      }
      
      // Find user with the reset token
      const user = await userRepository.findUserByPasswordResetToken(token);
      
      if (!user) {
        throw createUserError(UserErrorCode.PASSWORD_RESET_INVALID);
      }
      
      // Check if token is expired
      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        throw createUserError(UserErrorCode.PASSWORD_RESET_EXPIRED);
      }
      
      // Hash new password
      const hashedPassword = await hash(
        password, 
        config.userService.bcryptSaltRounds
      );
      
      // Update user password and clear reset token
      await userRepository.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });
      
      // Log the password reset
      await userRepository.createAuditLog({
        userId: user.id,
        action: 'user.password.reset',
        details: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      // Revoke all existing sessions for security
      await userRepository.deleteUserSessions(user.id);
      
      // Create notification
      await userRepository.createNotification({
        userId: user.id,
        type: 'system',
        title: 'Password Reset Successful',
        message: 'Your password has been successfully reset. If you did not initiate this action, please contact support immediately.',
        isRead: false,
      });
      
      res.json({
        success: true,
        message: 'Password has been reset successfully. Please login with your new password.',
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Verify account email using verification token
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        throw createUserError(
          UserErrorCode.MISSING_REQUIRED_FIELDS,
          'Verification token is required',
          400
        );
      }
      
      // Find user with verification token
      const user = await userRepository.findUserByVerificationToken(token);
      
      if (!user) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      // Update user verification status
      await userRepository.updateUser(user.id, {
        verified: true,
        verificationToken: null,
      });
      
      // Log the email verification
      await userRepository.createAuditLog({
        userId: user.id,
        action: 'user.email.verify',
        details: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({
        success: true,
        message: 'Email verified successfully. You can now login.',
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Invalidate all sessions except current
   */
  invalidateOtherSessions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.id) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const authHeader = req.headers.authorization;
      let currentToken = '';
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        currentToken = authHeader.substring(7);
      }
      
      // Delete all other sessions
      const deletedCount = await userRepository.deleteUserSessions(req.user.id, currentToken);
      
      // Log the session invalidation
      await userRepository.createAuditLog({
        userId: req.user.id,
        action: 'user.sessions.invalidate',
        details: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          sessionCount: deletedCount,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({
        success: true,
        message: `Successfully logged out from ${deletedCount} other devices.`,
        count: deletedCount,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Invalidate all sessions for the user
   */
  invalidateAllSessions = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.id) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      // Delete all sessions
      const deletedCount = await userRepository.deleteUserSessions(req.user.id);
      
      // Log the session invalidation
      await userRepository.createAuditLog({
        userId: req.user.id,
        action: 'user.sessions.invalidate_all',
        details: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          sessionCount: deletedCount,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({
        success: true,
        message: 'Successfully logged out from all devices.',
        count: deletedCount,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * Change password for authenticated user
   */
  changePassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.id) {
        throw createUserError(UserErrorCode.INVALID_TOKEN);
      }
      
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw createUserError(
          UserErrorCode.MISSING_REQUIRED_FIELDS,
          'Current password, new password and confirm password are required',
          400
        );
      }
      
      if (newPassword !== confirmPassword) {
        throw createUserError(UserErrorCode.PASSWORD_MISMATCH);
      }
      
      // Get the user
      const user = await userRepository.findUserById(req.user.id);
      
      if (!user) {
        throw createUserError(UserErrorCode.USER_NOT_FOUND);
      }
      
      // Verify current password
      const passwordMatches = await compare(currentPassword, user.password);
      
      if (!passwordMatches) {
        throw createUserError(UserErrorCode.INVALID_CREDENTIALS);
      }
      
      // Check if new password is the same as current password
      const sameAsOld = await compare(newPassword, user.password);
      if (sameAsOld) {
        throw createUserError(UserErrorCode.PASSWORD_SAME_AS_OLD);
      }
      
      // Hash new password
      const hashedPassword = await hash(
        newPassword, 
        config.userService.bcryptSaltRounds
      );
      
      // Update user password
      await userRepository.updateUser(user.id, {
        password: hashedPassword,
      });
      
      // Log the password change
      await userRepository.createAuditLog({
        userId: user.id,
        action: 'user.password.change',
        details: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      // Create notification
      await userRepository.createNotification({
        userId: user.id,
        type: 'system',
        title: 'Password Changed',
        message: 'Your password has been successfully changed. If you did not make this change, please contact support immediately.',
        isRead: false,
      });
      
      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (err) {
      next(err);
    }
  });
}

export default new AuthController();