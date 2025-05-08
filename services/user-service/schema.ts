/**
 * User Service Schema
 * 
 * Defines the database schema for the User Service using Drizzle ORM
 */
import { 
  pgTable, 
  serial, 
  text, 
  varchar, 
  timestamp, 
  boolean, 
  integer,
  json,
  primaryKey,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * User Table
 * Stores user account information
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  verified: boolean('verified').notNull().default(false),
  verificationToken: varchar('verification_token', { length: 255 }),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpires: timestamp('password_reset_expires', { mode: 'date' }),
  lastLoginAt: timestamp('last_login_at', { mode: 'date' }),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: timestamp('locked_until', { mode: 'date' }),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
  preferences: json('preferences').default({}),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

/**
 * User Profile Table
 * Stores additional user profile information
 */
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  avatar: varchar('avatar', { length: 255 }),
  company: varchar('company', { length: 100 }),
  position: varchar('position', { length: 100 }),
  location: varchar('location', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 255 }),
  socialLinks: json('social_links').default({}),
  timeZone: varchar('time_zone', { length: 50 }),
  language: varchar('language', { length: 10 }).default('en'),
  dateFormat: varchar('date_format', { length: 20 }).default('YYYY-MM-DD'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: uniqueIndex('user_profiles_user_id_idx').on(table.userId),
  };
});

/**
 * User Session Table
 * Tracks active user sessions
 */
export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull(),
  refreshToken: varchar('refresh_token', { length: 255 }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: varchar('user_agent', { length: 255 }),
  deviceInfo: json('device_info').default({}),
  isRevoked: boolean('is_revoked').default(false),
  lastActivityAt: timestamp('last_activity_at', { mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: uniqueIndex('user_sessions_user_id_idx').on(table.userId),
    tokenIdx: uniqueIndex('user_sessions_token_idx').on(table.token),
  };
});

/**
 * User Notification Table
 * Stores notifications for users
 */
export const userNotifications = pgTable('user_notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  link: varchar('link', { length: 255 }),
  isRead: boolean('is_read').default(false),
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
});

/**
 * Audit Log Table
 * Tracks user actions for security and compliance
 */
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 255 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: varchar('resource_id', { length: 50 }),
  details: json('details').default({}),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: varchar('user_agent', { length: 255 }),
  timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),
});

// Zod schemas for type validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['user', 'admin', 'superadmin']),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']),
}).omit({ id: true });

export const insertUserProfileSchema = createInsertSchema(userProfiles, {
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  phone: z.string().regex(/^[\d\+\-\(\) ]+$/, 'Invalid phone number format').optional(),
  website: z.string().url('Invalid website URL').optional(),
}).omit({ id: true });

export const insertUserSessionSchema = createInsertSchema(userSessions, {
  ipAddress: z.string().ip().optional(),
}).omit({ id: true });

export const insertUserNotificationSchema = createInsertSchema(userNotifications, {
  type: z.enum(['system', 'alert', 'message', 'task']),
}).omit({ id: true });

export const insertAuditLogSchema = createInsertSchema(auditLogs, {
  action: z.string().min(1, 'Action is required'),
}).omit({ id: true });

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Error codes for consistent error handling
export enum UserErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}