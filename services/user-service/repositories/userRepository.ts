/**
 * User Repository
 * 
 * Handles all database operations related to users
 */
import { eq, and, isNull, sql, desc, asc, count, like } from 'drizzle-orm';
import { 
  users, 
  userProfiles, 
  userSessions, 
  userNotifications, 
  auditLogs,
  User,
  InsertUser,
  UserProfile,
  InsertUserProfile,
  UserSession,
  InsertUserSession,
  UserNotification,
  InsertUserNotification,
  AuditLog,
  InsertAuditLog
} from '../schema';
import { PgDatabase } from 'drizzle-orm/pg-core';
import { NotFoundError } from '../../../shared/errors/ApiError';
import { createId } from '@paralleldrive/cuid2';

export class UserRepository {
  constructor(private db: PgDatabase) {}

  // User operations
  async getUserById(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);
    return result[0];
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          sql`${users.passwordResetExpires} > NOW()`
        )
      )
      .limit(1);
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await this.db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<User | undefined> {
    const [deletedUser] = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return deletedUser;
  }

  async searchUsers(query: string, limit: number = 10, offset: number = 0): Promise<User[]> {
    return this.db
      .select()
      .from(users)
      .where(
        sql`(
          ${users.username} ILIKE ${`%${query}%`} OR 
          ${users.email} ILIKE ${`%${query}%`} OR 
          ${users.firstName} ILIKE ${`%${query}%`} OR 
          ${users.lastName} ILIKE ${`%${query}%`}
        )`
      )
      .limit(limit)
      .offset(offset);
  }

  async listUsers(
    limit: number = 10,
    offset: number = 0,
    sortBy: keyof User = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    filters: Partial<User> = {}
  ): Promise<User[]> {
    let query = this.db.select().from(users);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // @ts-ignore - Dynamic key access
        query = query.where(eq(users[key as keyof typeof users], value));
      }
    });

    // Apply sorting
    if (sortOrder === 'asc') {
      // @ts-ignore - Dynamic key access
      query = query.orderBy(asc(users[sortBy as keyof typeof users]));
    } else {
      // @ts-ignore - Dynamic key access
      query = query.orderBy(desc(users[sortBy as keyof typeof users]));
    }

    return query.limit(limit).offset(offset);
  }

  async countUsers(filters: Partial<User> = {}): Promise<number> {
    let query = this.db.select({ count: count() }).from(users);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // @ts-ignore - Dynamic key access
        query = query.where(eq(users[key as keyof typeof users], value));
      }
    });

    const result = await query;
    return result[0]?.count || 0;
  }

  // User Profile operations
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const result = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return result[0];
  }

  async upsertUserProfile(profileData: InsertUserProfile): Promise<UserProfile | undefined> {
    // Check if profile exists
    const existingProfile = await this.getUserProfile(profileData.userId);

    if (!existingProfile) {
      // Create new profile
      const [profile] = await this.db
        .insert(userProfiles)
        .values(profileData)
        .returning();
      return profile;
    } else {
      // Update existing profile
      const [updatedProfile] = await this.db
        .update(userProfiles)
        .set({
          ...profileData,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, profileData.userId))
        .returning();
      return updatedProfile;
    }
  }

  // User Session operations
  async createSession(sessionData: InsertUserSession): Promise<UserSession> {
    const [session] = await this.db
      .insert(userSessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getSessionById(id: number): Promise<UserSession | undefined> {
    const result = await this.db
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, id))
      .limit(1);
    return result[0];
  }

  async getSessionByToken(token: string): Promise<UserSession | undefined> {
    const result = await this.db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.token, token),
          eq(userSessions.isRevoked, false),
          sql`${userSessions.expiresAt} > NOW()`
        )
      )
      .limit(1);
    return result[0];
  }

  async getUserSessions(userId: number): Promise<UserSession[]> {
    return this.db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.lastActivityAt));
  }

  async updateSessionActivity(id: number): Promise<void> {
    await this.db
      .update(userSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(userSessions.id, id));
  }

  async revokeSession(id: number): Promise<UserSession | undefined> {
    const [session] = await this.db
      .update(userSessions)
      .set({ isRevoked: true })
      .where(eq(userSessions.id, id))
      .returning();
    return session;
  }

  async deleteUserSessions(
    userId: number,
    exceptSessionId?: number
  ): Promise<number> {
    let query = this.db.delete(userSessions).where(eq(userSessions.userId, userId));
    
    if (exceptSessionId) {
      query = query.where(sql`${userSessions.id} != ${exceptSessionId}`);
    }
    
    const result = await query;
    return result.rowCount || 0;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db
      .delete(userSessions)
      .where(sql`${userSessions.expiresAt} < NOW()`);
    return result.rowCount || 0;
  }

  // Notification operations
  async createNotification(
    notificationData: InsertUserNotification
  ): Promise<UserNotification> {
    const [notification] = await this.db
      .insert(userNotifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async getUserNotifications(
    userId: number,
    limit: number = 20,
    offset: number = 0,
    onlyUnread: boolean = false
  ): Promise<UserNotification[]> {
    let query = this.db
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId));

    if (onlyUnread) {
      query = query.where(eq(userNotifications.isRead, false));
    }

    return query
      .orderBy(desc(userNotifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async markNotificationAsRead(
    id: number,
    userId: number
  ): Promise<UserNotification | undefined> {
    const [notification] = await this.db
      .update(userNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(userNotifications.id, id),
          eq(userNotifications.userId, userId)
        )
      )
      .returning();
    return notification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<number> {
    const result = await this.db
      .update(userNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false)
        )
      );
    return result.rowCount || 0;
  }

  async deleteNotification(
    id: number,
    userId: number
  ): Promise<UserNotification | undefined> {
    const [notification] = await this.db
      .delete(userNotifications)
      .where(
        and(
          eq(userNotifications.id, id),
          eq(userNotifications.userId, userId)
        )
      )
      .returning();
    return notification;
  }

  async countUnreadNotifications(userId: number): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(userNotifications)
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }

  // Audit log operations
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await this.db.insert(auditLogs).values(logData).returning();
    return log;
  }

  async getAuditLogs(
    filters: Partial<AuditLog> = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    let query = this.db.select().from(auditLogs);

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // @ts-ignore - Dynamic key access
        query = query.where(eq(auditLogs[key as keyof typeof auditLogs], value));
      }
    });

    return query
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getUserAuditLogs(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<AuditLog[]> {
    return this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);
  }
}