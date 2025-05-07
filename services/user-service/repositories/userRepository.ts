import { eq, and, desc, asc, like, ilike, or, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { 
  users, 
  sessions, 
  userProfiles, 
  auditLogs,
  notifications,
  type User,
  type InsertUser,
  type Session,
  type InsertSession,
  type UserProfile,
  type InsertUserProfile,
  type AuditLog,
  type InsertAuditLog,
  type Notification,
  type InsertNotification
} from '../schema';
import { NotFoundException, DatabaseException } from '../../../shared/errors';

/**
 * User Repository
 * Handles database operations for users and related entities
 */
export class UserRepository {
  /**
   * User Methods
   */
  
  // Get a user by ID
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      throw new DatabaseException('Failed to fetch user', { originalError: error.message });
    }
  }

  // Get a user by email
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      return user;
    } catch (error) {
      throw new DatabaseException('Failed to fetch user by email', { originalError: error.message });
    }
  }

  // Get all users
  async getAllUsers(
    limit: number = 50, 
    offset: number = 0, 
    sortBy: keyof User = 'id',
    sortOrder: 'asc' | 'desc' = 'asc',
    filters: { [key: string]: any } = {}
  ): Promise<User[]> {
    try {
      // Start with base query
      let query = db.select().from(users);
      
      // Apply filters
      if (filters) {
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
              ilike(users.company, `%${filters.search}%`)
            )
          );
        }
      }
      
      // Apply pagination
      query = query.limit(limit).offset(offset);
        
      // Apply sorting
      if (sortOrder === 'asc') {
        query = query.orderBy(asc(users[sortBy as keyof typeof users]));
      } else {
        query = query.orderBy(desc(users[sortBy as keyof typeof users]));
      }
      
      return await query;
    } catch (error) {
      throw new DatabaseException('Failed to fetch all users', { originalError: error.message });
    }
  }

  // Count all users (for pagination)
  async countUsers(filters: { [key: string]: any } = {}): Promise<number> {
    try {
      // Start with base query
      let query = db.select({ count: sql`count(*)` }).from(users);
      
      // Apply filters
      if (filters) {
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
              ilike(users.company, `%${filters.search}%`)
            )
          );
        }
      }
      
      const result = await query;
      return parseInt(result[0].count.toString(), 10);
    } catch (error) {
      throw new DatabaseException('Failed to count users', { originalError: error.message });
    }
  }

  // Create a user
  async createUser(user: InsertUser): Promise<User> {
    try {
      // Ensure email is lowercase for consistency
      user.email = user.email.toLowerCase();
      
      const [createdUser] = await db
        .insert(users)
        .values(user)
        .returning();
      return createdUser;
    } catch (error) {
      throw new DatabaseException('Failed to create user', { originalError: error.message });
    }
  }

  // Update a user
  async updateUser(id: number, userData: Partial<User>): Promise<void> {
    try {
      // Ensure email is lowercase if updating email
      if (userData.email) {
        userData.email = userData.email.toLowerCase();
      }
      
      // Update user
      const result = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning({ id: users.id });
        
      if (!result.length) {
        throw new NotFoundException('User', id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new DatabaseException('Failed to update user', { originalError: error.message });
    }
  }

  // Delete a user
  async deleteUser(id: number): Promise<void> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });
        
      if (!result.length) {
        throw new NotFoundException('User', id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new DatabaseException('Failed to delete user', { originalError: error.message });
    }
  }

  // Update login info
  async updateLoginInfo(id: number, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          loginAttempts: 0,
          lockUntil: null
        })
        .where(eq(users.id, id));
        
      // Log the login
      await this.createAuditLog({
        userId: id,
        action: 'LOGIN',
        ipAddress,
        userAgent,
        details: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      throw new DatabaseException('Failed to update login info', { originalError: error.message });
    }
  }

  // Increment login attempts
  async incrementLoginAttempts(email: string): Promise<number> {
    try {
      const user = await this.getUserByEmail(email);
      
      if (!user) {
        return 0;
      }
      
      const attempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 5 attempts
      let lockUntil = null;
      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      }
      
      await db
        .update(users)
        .set({
          loginAttempts: attempts,
          lockUntil
        })
        .where(eq(users.id, user.id));
      
      return attempts;
    } catch (error) {
      throw new DatabaseException('Failed to increment login attempts', { originalError: error.message });
    }
  }

  /**
   * Session Methods
   */
  
  // Get a session by token
  async getSessionByToken(token: string): Promise<Session | undefined> {
    try {
      const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
      return session;
    } catch (error) {
      throw new DatabaseException('Failed to fetch session', { originalError: error.message });
    }
  }

  // Get all sessions for a user
  async getUserSessions(userId: number): Promise<Session[]> {
    try {
      return await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(desc(sessions.lastActivityAt));
    } catch (error) {
      throw new DatabaseException('Failed to fetch user sessions', { originalError: error.message });
    }
  }

  // Create a session
  async createSession(session: InsertSession): Promise<Session> {
    try {
      const [createdSession] = await db
        .insert(sessions)
        .values(session)
        .returning();
      return createdSession;
    } catch (error) {
      throw new DatabaseException('Failed to create session', { originalError: error.message });
    }
  }

  // Update a session's last activity
  async updateSessionActivity(id: number): Promise<void> {
    try {
      await db
        .update(sessions)
        .set({
          lastActivityAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(sessions.id, id));
    } catch (error) {
      throw new DatabaseException('Failed to update session activity', { originalError: error.message });
    }
  }

  // Delete a session
  async deleteSession(id: number): Promise<void> {
    try {
      await db
        .delete(sessions)
        .where(eq(sessions.id, id));
    } catch (error) {
      throw new DatabaseException('Failed to delete session', { originalError: error.message });
    }
  }

  // Delete all sessions for a user
  async deleteUserSessions(userId: number, exceptSessionId?: number): Promise<void> {
    try {
      let query = db
        .delete(sessions)
        .where(eq(sessions.userId, userId));
      
      // Optionally preserve a specific session (current session)
      if (exceptSessionId) {
        query = query.where(sql`${sessions.id} != ${exceptSessionId}`);
      }
      
      await query;
    } catch (error) {
      throw new DatabaseException('Failed to delete user sessions', { originalError: error.message });
    }
  }

  // Delete expired sessions
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();
      const result = await db
        .delete(sessions)
        .where(sql`${sessions.expiresAt} < ${now}`)
        .returning();
      
      return result.length;
    } catch (error) {
      throw new DatabaseException('Failed to cleanup expired sessions', { originalError: error.message });
    }
  }

  /**
   * User Profile Methods
   */
  
  // Get a user profile by user ID
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    try {
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
      return profile;
    } catch (error) {
      throw new DatabaseException('Failed to fetch user profile', { originalError: error.message });
    }
  }

  // Create a user profile
  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    try {
      const [createdProfile] = await db
        .insert(userProfiles)
        .values(profile)
        .returning();
      return createdProfile;
    } catch (error) {
      throw new DatabaseException('Failed to create user profile', { originalError: error.message });
    }
  }

  // Update a user profile
  async updateUserProfile(userId: number, profileData: Partial<UserProfile>): Promise<void> {
    try {
      // Check if profile exists
      const existingProfile = await this.getUserProfile(userId);
      
      if (!existingProfile) {
        // Create profile if it doesn't exist
        await this.createUserProfile({
          ...profileData,
          userId
        } as InsertUserProfile);
        return;
      }
      
      // Update existing profile
      await db
        .update(userProfiles)
        .set({
          ...profileData,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));
    } catch (error) {
      throw new DatabaseException('Failed to update user profile', { originalError: error.message });
    }
  }

  /**
   * Audit Log Methods
   */
  
  // Create an audit log entry
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    try {
      const [createdLog] = await db
        .insert(auditLogs)
        .values(log)
        .returning();
      return createdLog;
    } catch (error) {
      throw new DatabaseException('Failed to create audit log', { originalError: error.message });
    }
  }

  // Get audit logs for a user
  async getUserAuditLogs(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      return await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userId))
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      throw new DatabaseException('Failed to fetch user audit logs', { originalError: error.message });
    }
  }

  /**
   * Notification Methods
   */
  
  // Create a notification
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const [createdNotification] = await db
        .insert(notifications)
        .values(notification)
        .returning();
      return createdNotification;
    } catch (error) {
      throw new DatabaseException('Failed to create notification', { originalError: error.message });
    }
  }

  // Get user notifications
  async getUserNotifications(
    userId: number,
    includeRead: boolean = false,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    try {
      let query = db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId));
      
      // Only include unread notifications if specified
      if (!includeRead) {
        query = query.where(eq(notifications.read, false));
      }

      // Apply filters for expired notifications
      const now = new Date();
      query = query.where(
        or(
          isNull(notifications.expiresAt),
          sql`${notifications.expiresAt} > ${now}`
        )
      );
      
      return await query
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      throw new DatabaseException('Failed to fetch user notifications', { originalError: error.message });
    }
  }

  // Mark notification as read
  async markNotificationAsRead(id: number, userId: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, id),
            eq(notifications.userId, userId)
          )
        );
    } catch (error) {
      throw new DatabaseException('Failed to mark notification as read', { originalError: error.message });
    }
  }

  // Mark all user notifications as read
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));
    } catch (error) {
      throw new DatabaseException('Failed to mark all notifications as read', { originalError: error.message });
    }
  }

  // Delete expired notifications
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const now = new Date();
      const result = await db
        .delete(notifications)
        .where(
          and(
            sql`${notifications.expiresAt} IS NOT NULL`,
            sql`${notifications.expiresAt} < ${now}`
          )
        )
        .returning();
      
      return result.length;
    } catch (error) {
      throw new DatabaseException('Failed to cleanup expired notifications', { originalError: error.message });
    }
  }
}