/**
 * User Repository
 * 
 * Handles persistence operations for user management
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, ilike, or, desc, asc } from 'drizzle-orm';
import {
  users,
  userProfiles,
  userSessions,
  userNotifications,
  auditLogs,
  type User,
  type UserProfile,
  type UserSession,
  type UserNotification,
  type AuditLog,
  type InsertUser,
  type InsertUserProfile,
  type InsertUserSession,
  type InsertUserNotification,
  type InsertAuditLog
} from '../schema';
import { config } from '../../../shared/config';
import { ServiceException, ErrorCode } from '../../../shared/errors';

// Initialize database connection
let pool: Pool;

try {
  pool = new Pool({
    connectionString: config.database.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  // Test the connection
  pool.query('SELECT NOW()').catch(err => {
    console.error('[UserRepository] Database connection failed:', err);
    throw new ServiceException(
      ErrorCode.DATABASE_ERROR,
      'Failed to connect to database'
    );
  });
} catch (error) {
  console.error('[UserRepository] Failed to initialize database pool:', error);
  throw new ServiceException(
    ErrorCode.DATABASE_ERROR,
    'Failed to initialize database connection'
  );
}

// Initialize Drizzle ORM
const db = drizzle(pool);

export class UserRepository {
  /**
   * Get user by ID
   */
  async getUser(userId: number): Promise<User | undefined> {
    try {
      const result = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`[UserRepository] Error fetching user ${userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error fetching user'
      );
    }
  }
  
  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`[UserRepository] Error fetching user by email ${email}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error fetching user by email'
      );
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select()
        .from(users)
        .where(eq(users.username, username.toLowerCase()))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`[UserRepository] Error fetching user by username ${username}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error fetching user by username'
      );
    }
  }
  
  /**
   * Create user
   */
  async createUser(userData: InsertUser): Promise<User> {
    try {
      const result = await db.insert(users)
        .values({
          ...userData,
          email: userData.email.toLowerCase(),
          username: userData.username?.toLowerCase(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('[UserRepository] Error creating user:', error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error creating user'
      );
    }
  }
  
  /**
   * Update user
   */
  async updateUser(userId: number, userData: Partial<User>): Promise<void> {
    try {
      await db.update(users)
        .set({
          ...userData,
          email: userData.email?.toLowerCase(),
          username: userData.username?.toLowerCase(),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error(`[UserRepository] Error updating user ${userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error updating user'
      );
    }
  }
  
  /**
   * Delete user
   */
  async deleteUser(userId: number): Promise<void> {
    try {
      await db.delete(users)
        .where(eq(users.id, userId));
    } catch (error) {
      console.error(`[UserRepository] Error deleting user ${userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error deleting user'
      );
    }
  }
  
  /**
   * Get user profile
   */
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    try {
      const result = await db.select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`[UserRepository] Error fetching profile for user ${userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error fetching user profile'
      );
    }
  }
  
  /**
   * Create user profile
   */
  async createUserProfile(profileData: InsertUserProfile): Promise<UserProfile> {
    try {
      const result = await db.insert(userProfiles)
        .values({
          ...profileData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`[UserRepository] Error creating profile for user ${profileData.userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error creating user profile'
      );
    }
  }
  
  /**
   * Update user profile
   */
  async updateUserProfile(userId: number, profileData: Partial<UserProfile>): Promise<void> {
    try {
      await db.update(userProfiles)
        .set({
          ...profileData,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));
    } catch (error) {
      console.error(`[UserRepository] Error updating profile for user ${userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error updating user profile'
      );
    }
  }
  
  /**
   * Get user sessions
   */
  async getUserSessions(userId: number): Promise<UserSession[]> {
    try {
      return await db.select()
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
        .orderBy(desc(userSessions.createdAt));
    } catch (error) {
      console.error(`[UserRepository] Error fetching sessions for user ${userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error fetching user sessions'
      );
    }
  }
  
  /**
   * Create user session
   */
  async createUserSession(sessionData: InsertUserSession): Promise<UserSession> {
    try {
      const result = await db.insert(userSessions)
        .values({
          ...sessionData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`[UserRepository] Error creating session for user ${sessionData.userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error creating user session'
      );
    }
  }
  
  /**
   * Update user session
   */
  async updateUserSession(sessionId: string, sessionData: Partial<UserSession>): Promise<void> {
    try {
      await db.update(userSessions)
        .set({
          ...sessionData,
          updatedAt: new Date()
        })
        .where(eq(userSessions.id, sessionId));
    } catch (error) {
      console.error(`[UserRepository] Error updating session ${sessionId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error updating user session'
      );
    }
  }
  
  /**
   * Delete user session
   */
  async deleteUserSession(sessionId: string, userId: number): Promise<void> {
    try {
      await db.delete(userSessions)
        .where(
          and(
            eq(userSessions.id, sessionId),
            eq(userSessions.userId, userId)
          )
        );
    } catch (error) {
      console.error(`[UserRepository] Error deleting session ${sessionId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error deleting user session'
      );
    }
  }
  
  /**
   * Delete all user sessions
   */
  async deleteAllUserSessions(userId: number): Promise<void> {
    try {
      await db.delete(userSessions)
        .where(eq(userSessions.userId, userId));
    } catch (error) {
      console.error(`[UserRepository] Error deleting all sessions for user ${userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error deleting user sessions'
      );
    }
  }
  
  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: number, 
    includeRead: boolean = false,
    limit: number = 50,
    offset: number = 0
  ): Promise<UserNotification[]> {
    try {
      let query = db.select()
        .from(userNotifications)
        .where(eq(userNotifications.userId, userId));
      
      if (!includeRead) {
        query = query.where(eq(userNotifications.read, false));
      }
      
      return await query
        .orderBy(desc(userNotifications.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error(`[UserRepository] Error fetching notifications for user ${userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error fetching user notifications'
      );
    }
  }
  
  /**
   * Create notification
   */
  async createNotification(notificationData: InsertUserNotification): Promise<UserNotification> {
    try {
      const result = await db.insert(userNotifications)
        .values({
          ...notificationData,
          read: false,
          createdAt: new Date()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`[UserRepository] Error creating notification for user ${notificationData.userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error creating notification'
      );
    }
  }
  
  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: number, userId: number): Promise<void> {
    try {
      await db.update(userNotifications)
        .set({ read: true })
        .where(
          and(
            eq(userNotifications.id, notificationId),
            eq(userNotifications.userId, userId)
          )
        );
    } catch (error) {
      console.error(`[UserRepository] Error marking notification ${notificationId} as read:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error marking notification as read'
      );
    }
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db.update(userNotifications)
        .set({ read: true })
        .where(
          and(
            eq(userNotifications.userId, userId),
            eq(userNotifications.read, false)
          )
        );
    } catch (error) {
      console.error(`[UserRepository] Error marking all notifications as read for user ${userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error marking all notifications as read'
      );
    }
  }
  
  /**
   * Create audit log
   */
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    try {
      const result = await db.insert(auditLogs)
        .values({
          ...logData,
          timestamp: new Date()
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('[UserRepository] Error creating audit log:', error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error creating audit log'
      );
    }
  }
  
  /**
   * Get user audit logs
   */
  async getUserAuditLogs(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      return await db.select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error(`[UserRepository] Error fetching audit logs for user ${userId}:`, error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error fetching audit logs'
      );
    }
  }
  
  /**
   * Get all users
   */
  async getAllUsers(
    limit: number = 50,
    offset: number = 0,
    sortBy: keyof User = 'id',
    sortOrder: 'asc' | 'desc' = 'asc',
    filters: Record<string, any> = {}
  ): Promise<User[]> {
    try {
      let query = db.select().from(users);
      
      // Apply filters
      if (filters.role) {
        query = query.where(eq(users.role, filters.role));
      }
      
      if (filters.status) {
        query = query.where(eq(users.status, filters.status));
      }
      
      if (filters.search) {
        query = query.where(
          or(
            ilike(users.email, `%${filters.search}%`),
            ilike(users.firstName, `%${filters.search}%`),
            ilike(users.lastName, `%${filters.search}%`),
            ilike(users.username, `%${filters.search}%`)
          )
        );
      }
      
      // Apply sorting
      if (sortOrder === 'asc') {
        query = query.orderBy(asc(users[sortBy]));
      } else {
        query = query.orderBy(desc(users[sortBy]));
      }
      
      // Apply pagination
      return await query.limit(limit).offset(offset);
    } catch (error) {
      console.error('[UserRepository] Error fetching users:', error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error fetching users'
      );
    }
  }
  
  /**
   * Count users
   */
  async countUsers(filters: Record<string, any> = {}): Promise<number> {
    try {
      let query = db.select({ count: db.fn.count() }).from(users);
      
      // Apply filters
      if (filters.role) {
        query = query.where(eq(users.role, filters.role));
      }
      
      if (filters.status) {
        query = query.where(eq(users.status, filters.status));
      }
      
      if (filters.search) {
        query = query.where(
          or(
            ilike(users.email, `%${filters.search}%`),
            ilike(users.firstName, `%${filters.search}%`),
            ilike(users.lastName, `%${filters.search}%`),
            ilike(users.username, `%${filters.search}%`)
          )
        );
      }
      
      const result = await query;
      return Number(result[0].count);
    } catch (error) {
      console.error('[UserRepository] Error counting users:', error);
      throw new ServiceException(
        ErrorCode.DATABASE_ERROR,
        'Error counting users'
      );
    }
  }
}