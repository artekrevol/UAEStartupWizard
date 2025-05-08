/**
 * User Service Schema
 * 
 * Contains Drizzle ORM schema definitions for user management microservice
 */
import { pgTable, serial, text, integer, timestamp, boolean, json, varchar, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * User table definition
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).unique(),
  password: text('password').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  profilePictureUrl: text('profile_picture_url'),
  company: varchar('company', { length: 255 }),
  position: varchar('position', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  newsletterSubscribed: boolean('newsletter_subscribed').default(false),
  preferences: json('preferences').default({}),
  verified: boolean('verified').default(false),
  verificationToken: text('verification_token'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires'),
  lastLogin: timestamp('last_login'),
  lastActive: timestamp('last_active'),
  loginAttempts: integer('login_attempts').default(0),
  lockUntil: timestamp('lock_until'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: text('two_factor_secret'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

/**
 * User profile table definition - extended user data
 */
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  bio: text('bio'),
  country: varchar('country', { length: 100 }),
  language: varchar('language', { length: 50 }).default('en'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  websiteUrl: text('website_url'),
  socialLinks: json('social_links').default({}),
  skills: json('skills').default([]),
  interests: json('interests').default([]),
  industry: varchar('industry', { length: 100 }),
  experience: json('experience').default([]),
  education: json('education').default([]),
  settings: json('settings').default({}),
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

/**
 * User sessions table definition - for tracking login sessions
 */
export const userSessions = pgTable('user_sessions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  location: json('location').default({}),
  device: varchar('device', { length: 100 }),
  browser: varchar('browser', { length: 100 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  lastActive: timestamp('last_active')
});

/**
 * Audit logs table definition - for activity tracking
 */
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }),
  resourceId: varchar('resource_id', { length: 255 }),
  details: json('details').default({}),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').notNull()
});

/**
 * User notifications table definition
 */
export const userNotifications = pgTable('user_notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  read: boolean('read').default(false),
  actionUrl: text('action_url'),
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at').notNull()
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

// Create validation schemas using Zod
export const insertUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email.email(),
  password: (schema) => schema.password.min(8),
  role: (schema) => schema.role.default('user'),
  status: (schema) => schema.status.default('active')
});

export const insertUserProfileSchema = createInsertSchema(userProfiles);
export const insertUserSessionSchema = createInsertSchema(userSessions);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertUserNotificationSchema = createInsertSchema(userNotifications);

// Export custom types and validation schemas
export const UserUpdateSchema = insertUserSchema.partial().omit({ id: true });
export const UserCredentialsSchema = insertUserSchema.pick({ email: true, password: true });
export const UserRegistrationSchema = insertUserSchema.pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true
});

export const UserProfileUpdateSchema = insertUserProfileSchema.partial().omit({ id: true, userId: true });

// Define extra error codes
export enum UserErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS'
}