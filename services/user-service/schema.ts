/**
 * User Service Schema
 * 
 * Defines the database schema for the User Service using Drizzle ORM
 */
import { 
  pgTable, serial, varchar, text, boolean, timestamp, 
  integer, unique, foreignKey, primaryKey, jsonb 
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';

// User table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 })
    .$type<'user' | 'admin' | 'superadmin'>()
    .notNull()
    .default('user'),
  status: varchar('status', { length: 50 })
    .$type<'active' | 'inactive' | 'suspended' | 'pending'>()
    .notNull()
    .default('active'),
  verified: boolean('verified').notNull().default(false),
  verificationToken: varchar('verification_token', { length: 255 }),
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpires: timestamp('password_reset_expires'),
  lastLoginAt: timestamp('last_login_at'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
  preferences: jsonb('preferences').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// User profiles table
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  bio: text('bio'),
  avatar: varchar('avatar', { length: 255 }),
  company: varchar('company', { length: 100 }),
  position: varchar('position', { length: 100 }),
  location: varchar('location', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 255 }),
  socialLinks: jsonb('social_links').default({}),
  timeZone: varchar('time_zone', { length: 50 }),
  language: varchar('language', { length: 10 }).default('en'),
  dateFormat: varchar('date_format', { length: 20 }).default('YYYY-MM-DD'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    userIdUnique: unique('user_id_unique').on(table.userId)
  };
});

// User sessions table
export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  refreshToken: varchar('refresh_token', { length: 255 }),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: varchar('user_agent', { length: 255 }),
  deviceInfo: jsonb('device_info').default({}),
  isRevoked: boolean('is_revoked').default(false),
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// User notifications table
export const userNotifications = pgTable('user_notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 })
    .$type<'message' | 'system' | 'alert' | 'task'>()
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  link: varchar('link', { length: 255 }),
  isRead: boolean('is_read').default(false),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 255 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: varchar('resource_id', { length: 50 }),
  details: jsonb('details').default({}),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: varchar('user_agent', { length: 255 }),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

// Zod schemas for validation
export const UserSchema = createSelectSchema(users);
export const InsertUserSchema = createInsertSchema(users, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
}).omit({ id: true });

export const UserProfileSchema = createSelectSchema(userProfiles);
export const InsertUserProfileSchema = createInsertSchema(userProfiles, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
}).omit({ id: true });

export const UserSessionSchema = createSelectSchema(userSessions);
export const InsertUserSessionSchema = createInsertSchema(userSessions, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
}).omit({ id: true });

export const UserNotificationSchema = createSelectSchema(userNotifications);
export const InsertUserNotificationSchema = createInsertSchema(userNotifications, {
  id: z.number().optional(),
  createdAt: z.date().optional(),
}).omit({ id: true });

export const AuditLogSchema = createSelectSchema(auditLogs);
export const InsertAuditLogSchema = createInsertSchema(auditLogs, {
  id: z.number().optional(),
  timestamp: z.date().optional(),
}).omit({ id: true });

// Custom validation schemas
export const UserCredentialsSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const UserRegistrationSchema = InsertUserSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const PasswordResetSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof InsertUserSchema>;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof InsertUserProfileSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof InsertUserSessionSchema>;

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = z.infer<typeof InsertUserNotificationSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof InsertAuditLogSchema>;