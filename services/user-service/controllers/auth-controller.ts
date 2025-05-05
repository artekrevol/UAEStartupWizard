/**
 * Authentication Controller
 * 
 * Handles user authentication and registration
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { ServiceException, ErrorCode } from '../../../shared/errors';
import { UserRole } from '../../../shared/types';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * User login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Email and password are required'
      );
    }
    
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ServiceException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    }
    
    // Update last login timestamp
    await db.update(users)
      .set({ last_login: new Date() })
      .where(eq(users.id, user.id));
    
    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '1h' }
    );
    
    // Return user info and token (excluding password)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      },
      token
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * User registration
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password, name } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Username, email, and password are required'
      );
    }
    
    // Check if user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
      
    if (existingUser.length > 0) {
      throw new ServiceException(
        ErrorCode.USER_ALREADY_EXISTS,
        'A user with this email already exists'
      );
    }
    
    // Check for duplicate username
    const existingUsername = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
      
    if (existingUsername.length > 0) {
      throw new ServiceException(
        ErrorCode.USER_ALREADY_EXISTS,
        'This username is already taken'
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [newUser] = await db.insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
        name,
        role: UserRole.USER,
        active: true,
        created_at: new Date()
      })
      .returning();
    
    // Return created user (excluding password)
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * Reset password request
 */
export async function requestPasswordReset(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    
    if (!email) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Email is required'
      );
    }
    
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user) {
      // Don't reveal whether a user exists, just say we've sent an email
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }
    
    // In a real implementation, we would generate a token and send an email
    // For the demo, we'll just return a success message
    
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * Change password
 */
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.userId);
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Current password and new password are required'
      );
    }
    
    // Find user
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      throw new ServiceException(
        ErrorCode.USER_NOT_FOUND,
        'User not found'
      );
    }
    
    // Verify current password
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new ServiceException(
        ErrorCode.INVALID_CREDENTIALS,
        'Current password is incorrect'
      );
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await db.update(users)
      .set({ 
        password: hashedPassword,
        updated_at: new Date()
      })
      .where(eq(users.id, userId));
    
    res.json({ message: 'Password changed successfully' });
    
  } catch (error) {
    next(error);
  }
}
