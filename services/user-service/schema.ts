/**
 * User Service Database Schema
 * 
 * Defines the database schema specific to the User Service
 */
import { pgTable, serial, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { UserRole } from '../../shared/types';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name'),
  role: text('role').default('user'),
  active: boolean('active').default(true),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// User profiles for extended information
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  company_name: text('company_name'),
  contact_phone: text('contact_phone'),
  contact_address: text('contact_address'),
  nationality: text('nationality'),
  preferences: text('preferences'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// User sessions for tracking active sessions
export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  session_token: text('session_token').notNull().unique(),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow()
});

// Password reset tokens
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  used: boolean('used').default(false)
});

// User activity logs
export const userActivityLogs = pgTable('user_activity_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  details: text('details'),
  ip_address: text('ip_address'),
  created_at: timestamp('created_at').defaultNow()
});

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true });
export const insertUserSessionSchema = createInsertSchema(userSessions).omit({ id: true });
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true });
export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({ id: true });

// Extended schemas with additional validation
export const userSchema = insertUserSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  email: z.string().email('Invalid email format'),
  role: z.enum([UserRole.USER, UserRole.ADMIN, UserRole.ANALYST])
});

// Types for database interactions
export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
