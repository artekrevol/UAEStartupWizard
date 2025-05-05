/**
 * AI Research Service Database Schema
 * 
 * Defines the database schema specific to the AI Research Service
 */
import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { ResearchStatus } from '../../shared/types';

// AI training data for model training
export const aiTrainingData = pgTable('ai_training_data', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category'),
  source: text('source'),
  verified: boolean('verified').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Research topics for web research
export const researchTopics = pgTable('research_topics', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id'),
  topic: text('topic').notNull(),
  description: text('description'),
  status: text('status').default('pending'),
  results: text('results'),
  sources: jsonb('sources').default([]),
  error: text('error'),
  created_at: timestamp('created_at').defaultNow(),
  completed_at: timestamp('completed_at'),
  updated_at: timestamp('updated_at')
});

// Web research items retrieved from searches
export const webResearchItems = pgTable('web_research_items', {
  id: serial('id').primaryKey(),
  research_topic_id: integer('research_topic_id').references(() => researchTopics.id),
  query: text('query').notNull(),
  url: text('url').notNull(),
  title: text('title'),
  content: text('content'),
  search_engine: text('search_engine'),
  relevance_score: integer('relevance_score'),
  created_at: timestamp('created_at').defaultNow()
});

// Conversations with AI assistants
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id'),
  session_id: text('session_id').notNull(),
  title: text('title'),
  summary: text('summary'),
  is_active: boolean('is_active').default(true),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Messages within conversations
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversation_id: integer('conversation_id').notNull().references(() => conversations.id),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  tokens: integer('tokens'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').defaultNow()
});

// Assistant memory for context retention
export const assistantMemory = pgTable('assistant_memory', {
  id: serial('id').primaryKey(),
  conversation_id: text('conversation_id').notNull(),
  thread_id: text('thread_id'),
  assistant_id: text('assistant_id'),
  memory_type: text('memory_type').notNull(),
  content: jsonb('content').notNull(),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Model usage tracking
export const modelUsage = pgTable('model_usage', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id'),
  model: text('model').notNull(),
  prompt_tokens: integer('prompt_tokens').notNull(),
  completion_tokens: integer('completion_tokens').notNull(),
  total_tokens: integer('total_tokens').notNull(),
  conversation_id: integer('conversation_id').references(() => conversations.id),
  research_topic_id: integer('research_topic_id').references(() => researchTopics.id),
  created_at: timestamp('created_at').defaultNow()
});

// Schemas for validation
export const insertAiTrainingDataSchema = createInsertSchema(aiTrainingData).omit({ id: true });
export const insertResearchTopicSchema = createInsertSchema(researchTopics).omit({ id: true });
export const insertWebResearchItemSchema = createInsertSchema(webResearchItems).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertAssistantMemorySchema = createInsertSchema(assistantMemory).omit({ id: true });
export const insertModelUsageSchema = createInsertSchema(modelUsage).omit({ id: true });

// Extended schemas with additional validation
export const researchTopicSchema = insertResearchTopicSchema.extend({
  status: z.enum([ResearchStatus.PENDING, ResearchStatus.IN_PROGRESS, 
                  ResearchStatus.COMPLETED, ResearchStatus.FAILED])
});

export const messageSchema = insertMessageSchema.extend({
  role: z.enum(['user', 'assistant', 'system'])
});

// Types for database interactions
export type AiTrainingData = typeof aiTrainingData.$inferSelect;
export type ResearchTopic = typeof researchTopics.$inferSelect;
export type WebResearchItem = typeof webResearchItems.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type AssistantMemory = typeof assistantMemory.$inferSelect;
export type ModelUsage = typeof modelUsage.$inferSelect;

export type InsertAiTrainingData = z.infer<typeof insertAiTrainingDataSchema>;
export type InsertResearchTopic = z.infer<typeof insertResearchTopicSchema>;
export type InsertWebResearchItem = z.infer<typeof insertWebResearchItemSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertAssistantMemory = z.infer<typeof insertAssistantMemorySchema>;
export type InsertModelUsage = z.infer<typeof insertModelUsageSchema>;
