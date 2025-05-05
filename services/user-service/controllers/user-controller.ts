/**
 * User Controller
 * 
 * Handles user account management operations
 */
import { Request, Response, NextFunction } from 'express';
import { ServiceException, ErrorCode } from '../../../shared/errors';
import { db } from '../db';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Get user by ID
 */
export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Invalid user ID'
      );
    }
    
    const [user] = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      name: users.name,
      role: users.role,
      active: users.active,
      created_at: users.created_at,
      preferences: users.preferences
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
    if (!user) {
      throw new ServiceException(
        ErrorCode.USER_NOT_FOUND,
        'User not found'
      );
    }
    
    res.json(user);
    
  } catch (error) {
    next(error);
  }
}

/**
 * List users with pagination
 */
export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    // Handle pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Get users with pagination
    const usersList = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      name: users.name,
      role: users.role,
      active: users.active,
      created_at: users.created_at
    })
    .from(users)
    .limit(limit)
    .offset(offset);
    
    // Get total count for pagination info
    const [{ count }] = await db.select({
      count: users.id
    })
    .from(users)
    .count();
    
    res.json({
      users: usersList,
      pagination: {
        total: Number(count),
        page,
        limit,
        pages: Math.ceil(Number(count) / limit)
      }
    });
    
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.userId);
    const { name, preferences } = req.body;
    
    if (isNaN(userId)) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Invalid user ID'
      );
    }
    
    // Find user first to ensure they exist
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!existingUser) {
      throw new ServiceException(
        ErrorCode.USER_NOT_FOUND,
        'User not found'
      );
    }
    
    // Update user profile
    const [updatedUser] = await db.update(users)
      .set({ 
        name: name || existingUser.name,
        preferences: preferences || existingUser.preferences,
        updated_at: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        role: users.role,
        preferences: users.preferences
      });
    
    res.json(updatedUser);
    
  } catch (error) {
    next(error);
  }
}

/**
 * Update user active status
 */
export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.userId);
    const { active } = req.body;
    
    if (isNaN(userId) || typeof active !== 'boolean') {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Invalid user ID or active status'
      );
    }
    
    // Find user first to ensure they exist
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!existingUser) {
      throw new ServiceException(
        ErrorCode.USER_NOT_FOUND,
        'User not found'
      );
    }
    
    // Update user active status
    const [updatedUser] = await db.update(users)
      .set({ 
        active,
        updated_at: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        active: users.active
      });
    
    res.json(updatedUser);
    
  } catch (error) {
    next(error);
  }
}

/**
 * Delete user account
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Invalid user ID'
      );
    }
    
    // Find user first to ensure they exist
    const [existingUser] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!existingUser) {
      throw new ServiceException(
        ErrorCode.USER_NOT_FOUND,
        'User not found'
      );
    }
    
    // Delete user
    await db.delete(users)
      .where(eq(users.id, userId));
    
    // In a real implementation, we might want to emit an event that a user was deleted
    // so other services can cleanup related data
    
    res.status(204).end();
    
  } catch (error) {
    next(error);
  }
}
