/**
 * Scraper Service Database Schema
 * 
 * Defines the database schema specific to the Scraper Service
 */
import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { ScraperTaskStatus, ScraperTaskType } from '../../shared/types';

// Scraper tasks for web scraping
export const scraperTasks = pgTable('scraper_tasks', {
  id: serial('id').primaryKey(),
  url: text('url').notNull(),
  type: text('type').notNull(),
  status: text('status').default('pending'),
  priority: integer('priority').default(1),
  description: text('description'),
  free_zone_id: integer('free_zone_id'),
  max_retries: integer('max_retries').default(3),
  retry_count: integer('retry_count').default(0),
  results: jsonb('results'),
  error: text('error'),
  created_at: timestamp('created_at').defaultNow(),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
  updated_at: timestamp('updated_at')
});

// Scraper results to store processed data
export const scraperResults = pgTable('scraper_results', {
  id: serial('id').primaryKey(),
  task_id: integer('task_id').references(() => scraperTasks.id),
  data_type: text('data_type').notNull(), // 'freezone', 'document', 'business_activity'
  content: jsonb('content').notNull(),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').defaultNow(),
  processed: boolean('processed').default(false),
  processed_at: timestamp('processed_at')
});

// Scheduled scraper tasks
export const scraperSchedules = pgTable('scraper_schedules', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  url: text('url').notNull(),
  type: text('type').notNull(),
  cron_expression: text('cron_expression').notNull(),
  free_zone_id: integer('free_zone_id'),
  enabled: boolean('enabled').default(true),
  last_run: timestamp('last_run'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// HTML cache for storing scraped content
export const htmlCache = pgTable('html_cache', {
  id: serial('id').primaryKey(),
  url: text('url').notNull().unique(),
  html_content: text('html_content').notNull(),
  headers: jsonb('headers').default({}),
  status_code: integer('status_code'),
  created_at: timestamp('created_at').defaultNow(),
  expires_at: timestamp('expires_at')
});

// Activity logs for scraper operations
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  component: text('component').notNull(),
  message: text('message').notNull(),
  severity: text('severity').default('info'),
  task_id: integer('task_id').references(() => scraperTasks.id),
  schedule_id: integer('schedule_id').references(() => scraperSchedules.id),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').defaultNow()
});

// Schemas for validation
export const insertScraperTaskSchema = createInsertSchema(scraperTasks).omit({ id: true });
export const insertScraperResultSchema = createInsertSchema(scraperResults).omit({ id: true });
export const insertScraperScheduleSchema = createInsertSchema(scraperSchedules).omit({ id: true });
export const insertHtmlCacheSchema = createInsertSchema(htmlCache).omit({ id: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true });

// Extended schemas with additional validation
export const scraperTaskSchema = insertScraperTaskSchema.extend({
  type: z.enum([ScraperTaskType.FREEZONE_INFO, ScraperTaskType.DOCUMENT_DOWNLOAD, 
                ScraperTaskType.BUSINESS_ACTIVITY, ScraperTaskType.GENERAL]),
  status: z.enum([ScraperTaskStatus.PENDING, ScraperTaskStatus.IN_PROGRESS, 
                  ScraperTaskStatus.COMPLETED, ScraperTaskStatus.FAILED, ScraperTaskStatus.RETRY])
});

export const scraperScheduleSchema = insertScraperScheduleSchema.extend({
  type: z.enum([ScraperTaskType.FREEZONE_INFO, ScraperTaskType.DOCUMENT_DOWNLOAD, 
                ScraperTaskType.BUSINESS_ACTIVITY, ScraperTaskType.GENERAL]),
  cron_expression: z.string().min(9).regex(/^(\*|[0-9]+|[0-9]+(-|,)[0-9]+|\*\/[0-9]+)\s(\*|[0-9]+|[0-9]+(-|,)[0-9]+|\*\/[0-9]+)\s(\*|[0-9]+|[0-9]+(-|,)[0-9]+|\*\/[0-9]+)\s(\*|[0-9]+|[0-9]+(-|,)[0-9]+|\*\/[0-9]+)\s(\*|[0-9]+|[0-9]+(-|,)[0-9]+|\*\/[0-9]+)(\s(\*|[0-9]+|[0-9]+(-|,)[0-9]+|\*\/[0-9]+))?$/)
});

export const activityLogSchema = insertActivityLogSchema.extend({
  severity: z.enum(['debug', 'info', 'warning', 'error', 'critical'])
});

// Types for database interactions
export type ScraperTask = typeof scraperTasks.$inferSelect;
export type ScraperResult = typeof scraperResults.$inferSelect;
export type ScraperSchedule = typeof scraperSchedules.$inferSelect;
export type HtmlCache = typeof htmlCache.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;

export type InsertScraperTask = z.infer<typeof insertScraperTaskSchema>;
export type InsertScraperResult = z.infer<typeof insertScraperResultSchema>;
export type InsertScraperSchedule = z.infer<typeof insertScraperScheduleSchema>;
export type InsertHtmlCache = z.infer<typeof insertHtmlCacheSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
