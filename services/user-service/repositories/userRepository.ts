/**
 * User Repository
 * 
 * Repository layer for user database operations
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, or, isNull, desc, asc, sql, gte, lte, ne, like } from 'drizzle-orm';
import { 
  users, 
  userProfiles, 
  userSessions, 
  userNotifications, 
  auditLogs,
  type User,
  type InsertUser,
  type UserProfile,
  type InsertUserProfile,
  type UserSession,
  type InsertUserSession,
  type AuditLog,
  type InsertAuditLog,
  type UserNotification,
  type InsertUserNotification
} from '../schema';
import { config } from '../../../shared/config';
import { createId } from '@paralleldrive/cuid2';
import { UserErrorCode } from '../schema';
import { ApiError } from '../../../shared/errors/ApiError';

export class UserRepository {
  private db;
  private pool;

  constructor() {
    // Initialize PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: config.database.url,
      max: config.database.maxConnections,
      idleTimeoutMillis: config.database.idleTimeoutMillis
    });
    
    // Initialize Drizzle ORM
    this.db = drizzle(this.pool);
  }

  /**
   * Clean up resources
   */
  async close() {
    await this.pool.end();
  }

  /**
   * Create a new user
   */
  async createUser(data: InsertUser): Promise<User> {
    try {
      const [user] = await this.db.insert(users).values(data).returning();
      return user;
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation in PostgreSQL
        if (error.detail?.includes('email')) {
          throw new ApiError('Email already exists', 409, UserErrorCode.EMAIL_ALREADY_EXISTS);
        } else if (error.detail?.includes('username')) {
          throw new ApiError('Username already exists', 409, UserErrorCode.USERNAME_ALREADY_EXISTS);
        }
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  /**
   * Get user with profile by ID
   */
  async getUserWithProfile(id: number): Promise<(User & { profile?: UserProfile }) | undefined> {
    const result = await this.db
      .select({
        user: users,
        profile: userProfiles
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.id, id))
      .limit(1);

    if (!result.length) return undefined;

    const { user, profile } = result[0];
    return { ...user, profile };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!username) return undefined;
    
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  }

  /**
   * Get user by verification token
   */
  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    if (!token) return undefined;
    
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);
    return user;
  }

  /**
   * Get user by password reset token
   */
  async getUserByResetToken(token: string): Promise<User | undefined> {
    if (!token) return undefined;
    
    const [user] = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          gte(users.passwordResetExpires as any, new Date())
        )
      )
      .limit(1);
    return user;
  }

  /**
   * Update user
   */
  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updatedUser] = await this.db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        if (error.detail?.includes('email')) {
          throw new ApiError('Email already exists', 409, UserErrorCode.EMAIL_ALREADY_EXISTS);
        } else if (error.detail?.includes('username')) {
          throw new ApiError('Username already exists', 409, UserErrorCode.USERNAME_ALREADY_EXISTS);
        }
      }
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return result.length > 0;
  }

  /**
   * List users with pagination
   */
  async listUsers(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'id',
    sortOrder: 'asc' | 'desc' = 'asc',
    filters: Record<string, any> = {}
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    // Build the base query
    let query = this.db.select().from(users);
    
    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key in users) {
          if (typeof value === 'string' && value.includes('*')) {
            // Handle wildcard searches
            const searchPattern = value.replace(/\*/g, '%');
            query = query.where(like(users[key as keyof typeof users] as any, searchPattern));
          } else {
            query = query.where(eq(users[key as keyof typeof users] as any, value));
          }
        }
      });
    }
    
    // Count total matching users
    const [{ count }] = await this.db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(users)
      // Note: ideally we would reuse the where conditions from above
      .execute();
    
    // Apply sorting
    if (sortBy in users) {
      if (sortOrder === 'desc') {
        query = query.orderBy(desc(users[sortBy as keyof typeof users] as any));
      } else {
        query = query.orderBy(asc(users[sortBy as keyof typeof users] as any));
      }
    }
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);
    
    // Execute the query
    const data = await query;
    
    return {
      data,
      total: count,
      page,
      limit
    };
  }

  /**
   * Create or update user profile
   */
  async upsertUserProfile(data: InsertUserProfile): Promise<UserProfile> {
    // Check if profile exists
    const [existingProfile] = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, data.userId))
      .limit(1);
    
    if (existingProfile) {
      // Update existing profile
      const [updatedProfile] = await this.db
        .update(userProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userProfiles.userId, data.userId))
        .returning();
      return updatedProfile;
    } else {
      // Create new profile
      const [newProfile] = await this.db
        .insert(userProfiles)
        .values({ ...data, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      return newProfile;
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return profile;
  }

  /**
   * Create user session
   */
  async createSession(data: InsertUserSession): Promise<UserSession> {
    const sessionId = createId();
    const [session] = await this.db
      .insert(userSessions)
      .values({ ...data, id: sessionId })
      .returning();
    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(id: string): Promise<UserSession | undefined> {
    const [session] = await this.db
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, id))
      .limit(1);
    return session;
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: number): Promise<UserSession[]> {
    return this.db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.createdAt));
  }

  /**
   * Update session
   */
  async updateSession(id: string, data: Partial<InsertUserSession>): Promise<UserSession | undefined> {
    const [session] = await this.db
      .update(userSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userSessions.id, id))
      .returning();
    return session;
  }

  /**
   * Delete session
   */
  async deleteSession(id: string): Promise<boolean> {
    const result = await this.db
      .delete(userSessions)
      .where(eq(userSessions.id, id))
      .returning({ id: userSessions.id });
    return result.length > 0;
  }

  /**
   * Delete all user sessions
   */
  async deleteUserSessions(userId: number, exceptSessionId?: string): Promise<number> {
    let query = this.db.delete(userSessions).where(eq(userSessions.userId, userId));
    
    if (exceptSessionId) {
      query = query.where(ne(userSessions.id, exceptSessionId));
    }
    
    const result = await query.returning({ id: userSessions.id });
    return result.length;
  }

  /**
   * Delete expired sessions
   */
  async deleteExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await this.db
      .delete(userSessions)
      .where(lte(userSessions.expiresAt as any, now))
      .returning({ id: userSessions.id });
    return result.length;
  }

  /**
   * Create user notification
   */
  async createNotification(data: InsertUserNotification): Promise<UserNotification> {
    const [notification] = await this.db
      .insert(userNotifications)
      .values(data)
      .returning();
    return notification;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: number,
    page: number = 1,
    limit: number = 10,
    includeRead: boolean = false
  ): Promise<{ data: UserNotification[]; total: number; page: number; limit: number }> {
    // Build query with conditions
    let query = this.db.select().from(userNotifications)
      .where(eq(userNotifications.userId, userId));
    
    // Filter out read notifications if not including them
    if (!includeRead) {
      query = query.where(eq(userNotifications.read, false));
    }
    
    // Count total matching notifications
    const [{ count }] = await this.db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .execute();
    
    // Apply sorting and pagination
    const offset = (page - 1) * limit;
    query = query.orderBy(desc(userNotifications.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Execute the query
    const data = await query;
    
    return {
      data,
      total: count,
      page,
      limit
    };
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: number): Promise<UserNotification | undefined> {
    const [notification] = await this.db
      .update(userNotifications)
      .set({ read: true })
      .where(eq(userNotifications.id, id))
      .returning();
    return notification;
  }

  /**
   * Mark all user notifications as read
   */
  async markAllNotificationsAsRead(userId: number): Promise<number> {
    const result = await this.db
      .update(userNotifications)
      .set({ read: true })
      .where(and(
        eq(userNotifications.userId, userId),
        eq(userNotifications.read, false)
      ))
      .returning({ id: userNotifications.id });
    return result.length;
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: number): Promise<boolean> {
    const result = await this.db
      .delete(userNotifications)
      .where(eq(userNotifications.id, id))
      .returning({ id: userNotifications.id });
    return result.length > 0;
  }

  /**
   * Create audit log
   */
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await this.db
      .insert(auditLogs)
      .values(data)
      .returning();
    return log;
  }

  /**
   * Get user audit logs
   */
  async getUserAuditLogs(
    userId: number,
    page: number = 1,
    limit: number = 10,
    actions?: string[]
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    // Build query with conditions
    let query = this.db.select().from(auditLogs)
      .where(eq(auditLogs.userId, userId));
    
    // Filter by actions if provided
    if (actions && actions.length > 0) {
      const actionConditions = actions.map(action => eq(auditLogs.action, action));
      query = query.where(or(...actionConditions));
    }
    
    // Count total matching logs
    const [{ count }] = await this.db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .execute();
    
    // Apply sorting and pagination
    const offset = (page - 1) * limit;
    query = query.orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);
    
    // Execute the query
    const data = await query;
    
    return {
      data,
      total: count,
      page,
      limit
    };
  }

  /**
   * Get all audit logs with pagination and filters
   */
  async getAuditLogs(
    page: number = 1,
    limit: number = 20,
    filters: Record<string, any> = {}
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    // Build the base query
    let query = this.db.select().from(auditLogs);
    
    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key in auditLogs) {
          query = query.where(eq(auditLogs[key as keyof typeof auditLogs] as any, value));
        }
      });
    }
    
    // Count total matching logs
    const [{ count }] = await this.db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(auditLogs)
      // Note: ideally we would reuse the where conditions from above
      .execute();
    
    // Apply sorting and pagination
    const offset = (page - 1) * limit;
    query = query.orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);
    
    // Execute the query
    const data = await query;
    
    return {
      data,
      total: count,
      page,
      limit
    };
  }

  /**
   * Get user stats
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersLast30Days: number;
    usersByRole: Record<string, number>;
  }> {
    // Total users
    const [{ count: totalUsers }] = await this.db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(users)
      .execute();
    
    // Active users
    const [{ count: activeUsers }] = await this.db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(users)
      .where(eq(users.status, 'active'))
      .execute();
    
    // New users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [{ count: newUsersLast30Days }] = await this.db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(users)
      .where(gte(users.createdAt as any, thirtyDaysAgo))
      .execute();
    
    // Users by role
    const usersByRoleResult = await this.db
      .select({
        role: users.role,
        count: sql`count(*)`.mapWith(Number)
      })
      .from(users)
      .groupBy(users.role)
      .execute();
    
    const usersByRole: Record<string, number> = {};
    usersByRoleResult.forEach(item => {
      usersByRole[item.role] = item.count;
    });
    
    return {
      totalUsers,
      activeUsers,
      newUsersLast30Days,
      usersByRole
    };
  }
}