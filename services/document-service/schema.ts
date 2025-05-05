/**
 * Document Service Database Schema
 * 
 * Defines the database schema specific to the Document Service
 */
import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { DocumentCategory, DocumentType } from '../../shared/types';

// Documents table for storing document metadata
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  filename: text('filename').notNull(),
  file_path: text('file_path').notNull(),
  mime_type: text('mime_type').notNull(),
  file_size: integer('file_size'),
  document_type: text('document_type'),
  category: text('category'),
  subcategory: text('subcategory'),
  content: text('content'),
  free_zone_id: integer('free_zone_id'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// User documents (specific to users)
export const userDocuments = pgTable('user_documents', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  filename: text('filename').notNull(),
  file_path: text('file_path').notNull(),
  mime_type: text('mime_type').notNull(),
  file_size: integer('file_size'),
  document_type: text('document_type').notNull(),
  document_category: text('document_category'),
  status: text('status').default('active'),
  expiry_date: timestamp('expiry_date'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Document templates for pre-defined document structures
export const documentTemplates = pgTable('document_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  free_zone_id: integer('free_zone_id'),
  category: text('category'),
  template_file: text('template_file'),
  required_documents: jsonb('required_documents').default([]),
  form_fields: jsonb('form_fields').default([]),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Template submissions when users fill out templates
export const templateSubmissions = pgTable('template_submissions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  template_id: integer('template_id').notNull().references(() => documentTemplates.id),
  submission_data: jsonb('submission_data').default({}),
  attached_documents: jsonb('attached_documents').default([]),
  status: text('status').default('draft'),
  submitted_at: timestamp('submitted_at'),
  updated_at: timestamp('updated_at')
});

// Document types reference table
export const documentTypes = pgTable('document_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  category: text('category'),
  required_fields: jsonb('required_fields').default([]),
  validation_rules: jsonb('validation_rules').default({}),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Document access logs for tracking
export const documentAccessLogs = pgTable('document_access_logs', {
  id: serial('id').primaryKey(),
  document_id: integer('document_id').references(() => documents.id),
  user_document_id: integer('user_document_id').references(() => userDocuments.id),
  user_id: integer('user_id'),
  action: text('action').notNull(), // 'view', 'download', 'edit', 'delete'
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow()
});

// Schemas for validation
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export const insertUserDocumentSchema = createInsertSchema(userDocuments).omit({ id: true });
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({ id: true });
export const insertTemplateSubmissionSchema = createInsertSchema(templateSubmissions).omit({ id: true });
export const insertDocumentTypeSchema = createInsertSchema(documentTypes).omit({ id: true });
export const insertDocumentAccessLogSchema = createInsertSchema(documentAccessLogs).omit({ id: true });

// Extended schemas with additional validation
export const documentSchema = insertDocumentSchema.extend({
  category: z.enum([DocumentCategory.BUSINESS_SETUP, DocumentCategory.VISA, 
                    DocumentCategory.LEGAL, DocumentCategory.FINANCIAL,
                    DocumentCategory.LICENSING, DocumentCategory.GENERAL])
});

export const userDocumentSchema = insertUserDocumentSchema.extend({
  document_type: z.enum([DocumentType.PDF, DocumentType.WORD, DocumentType.EXCEL, 
                           DocumentType.IMAGE, DocumentType.TEXT, DocumentType.OTHER])
});

// Types for database interactions
export type Document = typeof documents.$inferSelect;
export type UserDocument = typeof userDocuments.$inferSelect;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type TemplateSubmission = typeof templateSubmissions.$inferSelect;
export type DocumentTypeRef = typeof documentTypes.$inferSelect;
export type DocumentAccessLog = typeof documentAccessLogs.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertUserDocument = z.infer<typeof insertUserDocumentSchema>;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;
export type InsertTemplateSubmission = z.infer<typeof insertTemplateSubmissionSchema>;
export type InsertDocumentType = z.infer<typeof insertDocumentTypeSchema>;
export type InsertDocumentAccessLog = z.infer<typeof insertDocumentAccessLogSchema>;
