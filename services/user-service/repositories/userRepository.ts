/**
 * User Repository
 * 
 * Handles database operations for user-related entities
 */
import { eq, and, sql, desc, isNull, gt, lt, like, inArray, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pool from '../db';
import { 
  users, userProfiles, userSessions, userNotifications, auditLogs,
  type User, type InsertUser, type UserProfile, type InsertUserProfile,
  type UserSession, type InsertUserSession, type UserNotification, 
  type InsertUserNotification, type AuditLog, type InsertAuditLog
} from '../schema';

// Initialize Drizzle ORM with the database pool
const db = drizzle(pool);

export class UserRepository {
  // User operations
  async findUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async findUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async findUserByVerificationToken(token: string): Promise<User | undefined> {
    const result = await db.select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);
    return result[0];
  }

  async findUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const result = await db.select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          gt(users.passwordResetExpires, new Date())
        )
      )
      .limit(1);
    return result[0];
  }

  async createUser(data: InsertUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    // Add updated timestamp
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async deleteUser(id: number): Promise<User | undefined> {
    const result = await db.delete(users)
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async listUsers(
    limit: number = 10, 
    offset: number = 0, 
    search?: string,
    role?: string,
    status?: string
  ): Promise<{ users: User[], total: number }> {
    // Build where conditions dynamically
    let conditions = [];
    
    if (search) {
      conditions.push(
        or(
          like(users.username, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`)
        )
      );
    }
    
    if (role) {
      conditions.push(eq(users.role, role));
    }
    
    if (status) {
      conditions.push(eq(users.status, status));
    }
    
    // Query users with conditions
    let whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const usersResult = whereClause
      ? await db.select().from(users).where(whereClause).limit(limit).offset(offset).orderBy(desc(users.createdAt))
      : await db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.createdAt));
    
    // Count total users matching conditions
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const total = countResult[0]?.count || 0;
    
    return { users: usersResult, total };
  }

  // User Profile operations
  async findProfileByUserId(userId: number): Promise<UserProfile | undefined> {
    const result = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    
    return result[0];
  }

  async createProfile(data: InsertUserProfile): Promise<UserProfile> {
    const result = await db.insert(userProfiles)
      .values(data)
      .returning();
    
    return result[0];
  }

  async updateProfile(userId: number, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    // Add updated timestamp
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    const result = await db.update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.userId, userId))
      .returning();
    
    return result[0];
  }

  // User Session operations
  async findSessionByToken(token: string): Promise<UserSession | undefined> {
    const result = await db.select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.token, token),
          eq(userSessions.isRevoked, false),
          gt(userSessions.expiresAt, new Date())
        )
      )
      .limit(1);
    
    return result[0];
  }

  async findSessionsByUserId(userId: number): Promise<UserSession[]> {
    return await db.select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.lastActivityAt));
  }

  async createSession(data: InsertUserSession): Promise<UserSession> {
    const result = await db.insert(userSessions)
      .values(data)
      .returning();
    
    return result[0];
  }

  async updateSession(id: number, data: Partial<InsertUserSession>): Promise<UserSession | undefined> {
    const result = await db.update(userSessions)
      .set(data)
      .where(eq(userSessions.id, id))
      .returning();
    
    return result[0];
  }

  async revokeSession(token: string): Promise<UserSession | undefined> {
    const result = await db.update(userSessions)
      .set({ 
        isRevoked: true,
        lastActivityAt: new Date()
      })
      .where(eq(userSessions.token, token))
      .returning();
    
    return result[0];
  }

  async deleteUserSessions(userId: number, exceptToken?: string): Promise<number> {
    let query = db.delete(userSessions).where(eq(userSessions.userId, userId));
    
    // If exceptToken is provided, don't delete that session
    if (exceptToken) {
      query = query.where(sql`token != ${exceptToken}`);
    }
    
    const result = await query;
    return result.rowCount || 0;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await db.delete(userSessions)
      .where(
        or(
          lt(userSessions.expiresAt, new Date()),
          eq(userSessions.isRevoked, true)
        )
      );
    
    return result.rowCount || 0;
  }

  // Notification operations
  async findNotificationById(id: number): Promise<UserNotification | undefined> {
    const result = await db.select()
      .from(userNotifications)
      .where(eq(userNotifications.id, id))
      .limit(1);
    
    return result[0];
  }

  async findNotificationsByUserId(
    userId: number, 
    limit: number = 10, 
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{ notifications: UserNotification[], total: number }> {
    let conditions = [eq(userNotifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(userNotifications.isRead, false));
    }
    
    const whereClause = and(...conditions);
    
    const notificationsResult = await db.select()
      .from(userNotifications)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(userNotifications.createdAt));
    
    // Count total notifications matching conditions
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(userNotifications)
      .where(whereClause);
    
    const total = countResult[0]?.count || 0;
    
    return { notifications: notificationsResult, total };
  }

  async createNotification(data: InsertUserNotification): Promise<UserNotification> {
    const result = await db.insert(userNotifications)
      .values(data)
      .returning();
    
    return result[0];
  }

  async markNotificationAsRead(id: number): Promise<UserNotification | undefined> {
    const result = await db.update(userNotifications)
      .set({ isRead: true })
      .where(eq(userNotifications.id, id))
      .returning();
    
    return result[0];
  }

  async markAllNotificationsAsRead(userId: number): Promise<number> {
    const result = await db.update(userNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(userNotifications.userId, userId),
          eq(userNotifications.isRead, false)
        )
      );
    
    return result.rowCount || 0;
  }

  async deleteNotification(id: number): Promise<UserNotification | undefined> {
    const result = await db.delete(userNotifications)
      .where(eq(userNotifications.id, id))
      .returning();
    
    return result[0];
  }

  async deleteNotificationsByUserId(userId: number): Promise<number> {
    const result = await db.delete(userNotifications)
      .where(eq(userNotifications.userId, userId));
    
    return result.rowCount || 0;
  }

  // Audit log operations
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const result = await db.insert(auditLogs)
      .values(data)
      .returning();
    
    return result[0];
  }

  async findAuditLogs(
    limit: number = 50, 
    offset: number = 0,
    userId?: number,
    action?: string,
    resourceType?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ logs: AuditLog[], total: number }> {
    // Build where conditions dynamically
    let conditions = [];
    
    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }
    
    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }
    
    if (resourceType) {
      conditions.push(eq(auditLogs.resourceType, resourceType));
    }
    
    if (startDate) {
      conditions.push(gt(auditLogs.timestamp, startDate));
    }
    
    if (endDate) {
      conditions.push(lt(auditLogs.timestamp, endDate));
    }
    
    // Query logs with conditions
    let whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const logsResult = whereClause
      ? await db.select().from(auditLogs).where(whereClause).limit(limit).offset(offset).orderBy(desc(auditLogs.timestamp))
      : await db.select().from(auditLogs).limit(limit).offset(offset).orderBy(desc(auditLogs.timestamp));
    
    // Count total logs matching conditions
    const countQuery = whereClause
      ? db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(whereClause)
      : db.select({ count: sql<number>`count(*)` }).from(auditLogs);
    
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;
    
    return { logs: logsResult, total };
  }
}

// Export a singleton instance
export default new UserRepository();