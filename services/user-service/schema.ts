/**
 * User Service Database Schema
 * 
 * Defines the database schema specific to the User Service
 */
import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
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
  role: text('role').notNull().default('user'),
  active: boolean('active').default(true),
  preferences: jsonb('preferences').default({}),
  email_verified: boolean('email_verified').default(false),
  verification_token: text('verification_token'),
  reset_token: text('reset_token'),
  reset_token_expires: timestamp('reset_token_expires'),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Login attempts table for rate limiting
export const loginAttempts = pgTable('login_attempts', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  ip_address: text('ip_address').notNull(),
  user_agent: text('user_agent'),
  successful: boolean('successful').default(false),
  created_at: timestamp('created_at').defaultNow()
});

// User profiles with additional information
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  company_name: text('company_name'),
  job_title: text('job_title'),
  industry: text('industry'),
  company_size: text('company_size'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  country: text('country'),
  bio: text('bio'),
  website: text('website'),
  social_links: jsonb('social_links').default({}),
  profile_completed: boolean('profile_completed').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// User activity logs
export const userActivityLogs = pgTable('user_activity_logs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  activity_type: text('activity_type').notNull(),
  description: text('description'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').defaultNow()
});

// User notifications for in-app messaging
export const userNotifications = pgTable('user_notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'),
  read: boolean('read').default(false),
  action_url: text('action_url'),
  created_at: timestamp('created_at').defaultNow(),
  expires_at: timestamp('expires_at')
});

// User subscription plans
export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  price: integer('price').notNull(),
  billing_cycle: text('billing_cycle').default('monthly'),
  features: jsonb('features').default([]),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// User subscriptions
export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id),
  plan_id: integer('plan_id').notNull().references(() => subscriptionPlans.id),
  status: text('status').notNull().default('active'),
  current_period_start: timestamp('current_period_start').notNull(),
  current_period_end: timestamp('current_period_end').notNull(),
  cancel_at_period_end: boolean('cancel_at_period_end').default(false),
  payment_method: text('payment_method'),
  payment_id: text('payment_id'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at'),
  cancelled_at: timestamp('cancelled_at')
});

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({ id: true });
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true });
export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({ id: true });
export const insertUserNotificationSchema = createInsertSchema(userNotifications).omit({ id: true });
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true });
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ id: true });

// Extended schemas with additional validation
export const userSchema = insertUserSchema.extend({
  role: z.enum([UserRole.ADMIN, UserRole.ANALYST, UserRole.USER, UserRole.GUEST]),
  password: z.string().min(8).max(100),
  email: z.string().email()
});

export const userNotificationSchema = insertUserNotificationSchema.extend({
  type: z.enum(['info', 'warning', 'success', 'error'])
});

export const userSubscriptionSchema = insertUserSubscriptionSchema.extend({
  status: z.enum(['active', 'cancelled', 'past_due', 'trialing', 'incomplete'])
});

// Types for database interactions
export type User = typeof users.$inferSelect;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type UserNotification = typeof userNotifications.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type InsertUserNotification = z.infer<typeof insertUserNotificationSchema>;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
