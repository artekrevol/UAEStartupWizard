import { pgTable, serial, text, integer, timestamp, jsonb, boolean, foreignKey } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Documents table stores all free zone documents and their metadata
 */
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  documentType: text('document_type'),
  category: text('category'),
  subcategory: text('subcategory'),
  content: text('content'),
  freeZoneId: integer('free_zone_id'),
  metadata: jsonb('metadata').default({}),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  status: text('status').default('active'),
  isPublic: boolean('is_public').default(false),
  tags: jsonb('tags').default([]),
  lastUpdated: timestamp('last_updated').defaultNow(),
});

/**
 * User Documents table stores all user-specific documents
 */
export const userDocuments = pgTable('user_documents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  filename: text('filename').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size'),
  documentType: text('document_type').notNull(),
  documentCategory: text('document_category'),
  status: text('status').default('active'),
  expiryDate: timestamp('expiry_date'),
  metadata: jsonb('metadata').default({}),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Document Templates table stores templates for generating documents
 */
export const documentTemplates = pgTable('document_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  freeZoneId: integer('free_zone_id'),
  category: text('category'),
  templateFile: text('template_file'),
  requiredDocuments: jsonb('required_documents').default([]),
  formFields: jsonb('form_fields').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  version: text('version').default('1.0'),
  status: text('status').default('active'),
});

/**
 * Template Submissions table stores filled templates from users
 */
export const templateSubmissions = pgTable('template_submissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  templateId: integer('template_id').notNull(),
  submissionData: jsonb('submission_data').default({}),
  attachedDocuments: jsonb('attached_documents').default([]),
  status: text('status').default('draft'),
  submittedAt: timestamp('submitted_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
  approvalStatus: text('approval_status').default('pending'),
  reviewNotes: text('review_notes'),
  reviewedBy: integer('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
});

/**
 * Document Types table stores metadata about document types
 */
export const documentTypes = pgTable('document_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  requiredFields: jsonb('required_fields').default([]),
  validationRules: jsonb('validation_rules').default({}),
  displayName: text('display_name'),
  icon: text('icon'),
  usageCount: integer('usage_count').default(0),
});

/**
 * SAIF Zone Forms table stores SAIF Zone specific form templates
 */
export const saifZoneForms = pgTable('saif_zone_forms', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  formType: text('form_type').notNull(),
  fileUrl: text('file_url'),
  requirements: jsonb('requirements').default({}),
  formFields: jsonb('form_fields').default([]),
  submission: jsonb('submission').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  version: text('version').default('1.0'),
});

/**
 * Document Audit Logs table tracks document operations
 */
export const documentAuditLogs = pgTable('document_audit_logs', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id'),
  userDocumentId: integer('user_document_id'),
  userId: integer('user_id'),
  action: text('action').notNull(), // upload, view, delete, update, share
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow(),
  details: jsonb('details').default({}),
});

/**
 * Document Access Controls table manages document permissions
 */
export const documentAccessControls = pgTable('document_access_controls', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id'),
  userDocumentId: integer('user_document_id'),
  userId: integer('user_id'), // Who has access
  grantedBy: integer('granted_by'), // Who gave access
  accessLevel: text('access_level').notNull(), // read, write, admin
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Schema definitions for insert operations
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export const insertUserDocumentSchema = createInsertSchema(userDocuments).omit({ id: true });
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({ id: true });
export const insertTemplateSubmissionSchema = createInsertSchema(templateSubmissions).omit({ id: true });
export const insertDocumentTypeSchema = createInsertSchema(documentTypes).omit({ id: true });
export const insertSaifZoneFormSchema = createInsertSchema(saifZoneForms).omit({ id: true });
export const insertDocumentAuditLogSchema = createInsertSchema(documentAuditLogs).omit({ id: true });
export const insertDocumentAccessControlSchema = createInsertSchema(documentAccessControls).omit({ id: true });

// Type definitions
export type Document = typeof documents.$inferSelect;
export type UserDocument = typeof userDocuments.$inferSelect;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type TemplateSubmission = typeof templateSubmissions.$inferSelect;
export type DocumentType = typeof documentTypes.$inferSelect;
export type SaifZoneForm = typeof saifZoneForms.$inferSelect;
export type DocumentAuditLog = typeof documentAuditLogs.$inferSelect;
export type DocumentAccessControl = typeof documentAccessControls.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertUserDocument = z.infer<typeof insertUserDocumentSchema>;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;
export type InsertTemplateSubmission = z.infer<typeof insertTemplateSubmissionSchema>;
export type InsertDocumentType = z.infer<typeof insertDocumentTypeSchema>;
export type InsertSaifZoneForm = z.infer<typeof insertSaifZoneFormSchema>;
export type InsertDocumentAuditLog = z.infer<typeof insertDocumentAuditLogSchema>;
export type InsertDocumentAccessControl = z.infer<typeof insertDocumentAccessControlSchema>;