import { pgTable, serial, text, integer, timestamp, jsonb, boolean, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// User roles enum
export const USER_ROLES = [
  "user",
  "premium_user",
  "admin",
  "super_admin"
] as const;

// Define user role enum
export const userRolesEnum = pgEnum('user_roles', USER_ROLES);

// Define interaction types enum
export const INTERACTION_TYPES = [
  "page_view",
  "button_click", 
  "form_submit",
  "form_abandon",
  "document_view",
  "document_download",
  "document_upload",
  "search",
  "filter_use",
  "compare_freezones",
  "login",
  "logout",
  "registration",
  "business_setup_start",
  "business_setup_complete",
  "business_setup_abandon",
  "notification_click",
  "external_link_click",
  "error_encounter",
  "feature_use",
  "support_request"
] as const;

// Constants for legal forms in UAE
export const LEGAL_FORMS = [
  "LLC",
  "Free Zone Company",
  "Sole Establishment",
  "Civil Company",
  "Branch of Foreign Company",
  "Representative Office",
  "Public Joint Stock Company (PJSC)",
  "Private Joint Stock Company",
  "Partnership",
  "Limited Partnership",
] as const;

// Users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  password: text('password').notNull(),
  role: userRolesEnum('role').default('user'),
  company_name: text('company_name'),
  first_name: text('first_name'),
  last_name: text('last_name'),
  phone: text('phone'),
  profile_image: text('profile_image'),
  preferences: jsonb('preferences').default({}),
  last_login: timestamp('last_login'),
  subscription_tier: text('subscription_tier').default('free'),
  subscription_status: text('subscription_status'),
  subscription_expiry: timestamp('subscription_expiry'),
  progress: integer('progress').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  active: boolean('active').default(true),
});

// Free Zones
export const freeZones = pgTable('free_zones', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  location: text('location'),
  benefits: jsonb('benefits').default({}),
  requirements: jsonb('requirements').default({}),
  industries: jsonb('industries').default({}),
  licenseTypes: jsonb('license_types').default({}),
  facilities: jsonb('facilities').default({}),
  website: text('website'),
  setupCost: jsonb('setup_cost').default({}),
  faqs: jsonb('faqs').default({}),
  lastUpdated: timestamp('last_updated'),
});

// Business Activities
export const businessActivities = pgTable('business_activities', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => businessActivityCategories.id),
  name: text('name').notNull(),
  code: text('code'),
  description: text('description'),
  requirements: text('requirements'),
  feeStructure: jsonb('fee_structure').default({}),
  applicableIn: jsonb('applicable_in').default([]),
  restrictions: text('restrictions'),
  approvalTime: text('approval_time'),
  approvalRequirements: text('approval_requirements'),
});

// Business Activity Categories
export const businessActivityCategories = pgTable('business_activity_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  parentId: integer('parent_id').references(() => businessActivityCategories.id),
});

// Documents
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
  freeZoneId: integer('free_zone_id').references(() => freeZones.id),
  // Note: userId is not in the actual database table
  metadata: jsonb('metadata').default({}),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

// User Documents (new)
export const userDocuments = pgTable('user_documents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
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

// Document Templates
export const documentTemplates = pgTable('document_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  freeZoneId: integer('free_zone_id').references(() => freeZones.id),
  category: text('category'),
  templateFile: text('template_file'),
  requiredDocuments: jsonb('required_documents').default([]),
  formFields: jsonb('form_fields').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Template Submissions
export const templateSubmissions = pgTable('template_submissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  templateId: integer('template_id').notNull().references(() => documentTemplates.id),
  submissionData: jsonb('submission_data').default({}),
  attachedDocuments: jsonb('attached_documents').default([]),
  status: text('status').default('draft'),
  submittedAt: timestamp('submitted_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Business Setup
export const businessSetup = pgTable('business_setup', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  businessType: text('business_type'),
  businessName: text('business_name'),
  businessActivity: text('business_activity'),
  selectedFreeZone: integer('selected_free_zone').references(() => freeZones.id),
  budget: text('budget'),
  timeline: text('timeline'),
  requirements: jsonb('requirements').default({}),
  progress: jsonb('progress').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// AI Training Data
export const aiTrainingData = pgTable('ai_training_data', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category'),
  source: text('source'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// SAIF Zone Forms
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
});

// Document Types (reference data)
export const documentTypes = pgTable('document_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  requiredFields: jsonb('required_fields').default([]),
  validationRules: jsonb('validation_rules').default({}),
});

// Assistant Memory
export const assistantMemory = pgTable('assistant_memory', {
  id: serial('id').primaryKey(),
  conversationId: text('conversation_id').notNull(),
  threadId: text('thread_id'),
  assistantId: text('assistant_id'),
  memoryType: text('memory_type').notNull(),
  content: jsonb('content').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Issues Log
export const issuesLog = pgTable('issues_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  type: text('type').notNull(), // 'error', 'behavior', 'crash', 'feedback'
  severity: text('severity').default('info'), // 'info', 'warning', 'error', 'critical'
  message: text('message'),
  metadata: jsonb('metadata').default({}),
  resolved: boolean('resolved').default(false),
  created_at: timestamp('created_at').defaultNow(),
  resolved_at: timestamp('resolved_at'),
  url: text('url'),
  user_agent: text('user_agent'),
  component: text('component'),
  action: text('action'),
  stack_trace: text('stack_trace'),
});

// Conversations
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  sessionId: text('session_id'),
  // Note: source column is not in the actual database table
  // source: text('source').notNull(), // 'chat', 'setup-flow', 'premium-agent'
  summary: text('summary'),
  isActive: boolean('is_active'),
  // Note: lastMessageTime column is not in the actual database table
  // lastMessageTime: timestamp('last_message_time').defaultNow(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Messages
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// Web Research Items
export const webResearchItems = pgTable('web_research_items', {
  id: serial('id').primaryKey(),
  query: text('query').notNull(),
  url: text('url').notNull(),
  title: text('title'),
  content: text('content'),
  searchEngine: text('search_engine'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Activity Logs
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  component: text('component').notNull(),
  message: text('message').notNull(),
  severity: text('severity').default('info'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at').defaultNow(),
});

// User Interactions
export const userInteractions = pgTable('user_interactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  username: text('username'),
  sessionId: text('session_id'),
  interactionType: text('interaction_type').notNull(),
  pageUrl: text('page_url'),
  component: text('component'),
  elementId: text('element_id'),
  elementText: text('element_text'),
  interactionValue: text('interaction_value'),
  metadata: jsonb('metadata').default({}),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  deviceType: text('device_type'),
  duration: integer('duration'),
  success: boolean('success'),
  createdAt: timestamp('created_at').defaultNow(),
});

// API Gateways
export const apiGateways = pgTable('api_gateways', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  baseUrl: text('base_url').notNull(),
  authType: text('auth_type').default('jwt'),
  status: text('status').default('active'),
  rateLimitPerMinute: integer('rate_limit_per_minute').default(100),
  accessRoles: jsonb('access_roles').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// API Routes
export const apiRoutes = pgTable('api_routes', {
  id: serial('id').primaryKey(),
  gatewayId: integer('gateway_id').references(() => apiGateways.id),
  path: text('path').notNull(),
  method: text('method').notNull(),
  description: text('description'),
  requiredRoles: jsonb('required_roles').default([]),
  isPublic: boolean('is_public').default(false),
  serviceId: text('service_id'),
  rateLimitPerMinute: integer('rate_limit_per_minute'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Admin Dashboards
export const adminDashboards = pgTable('admin_dashboards', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'),
  path: text('path').notNull(),
  category: text('category'),
  requiredRoles: jsonb('required_roles').default(['admin', 'super_admin']),
  order: integer('order').default(0),
  isActive: boolean('is_active').default(true),
  components: jsonb('components').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Admin Dashboard Widgets
export const adminDashboardWidgets = pgTable('admin_dashboard_widgets', {
  id: serial('id').primaryKey(),
  dashboardId: integer('dashboard_id').references(() => adminDashboards.id),
  name: text('name').notNull(),
  type: text('type').notNull(), // chart, table, metrics, etc.
  dataSource: text('data_source'),
  dataQuery: text('data_query'),
  refreshInterval: integer('refresh_interval'), // in seconds
  position: jsonb('position').default({}), // x, y, w, h
  config: jsonb('config').default({}),
  requiredRoles: jsonb('required_roles').default(['admin']),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Conversation Interfaces
export const conversationInterfaces = pgTable('conversation_interfaces', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  steps: jsonb('steps').default([]),
  initialMessage: text('initial_message'),
  theme: jsonb('theme').default({}),
  category: text('category'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  analytics: jsonb('analytics').default({}),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertFreeZoneSchema = createInsertSchema(freeZones).omit({ id: true });
export const insertBusinessActivitySchema = createInsertSchema(businessActivities).omit({ id: true });
export const insertBusinessActivityCategorySchema = createInsertSchema(businessActivityCategories).omit({ id: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export const insertUserDocumentSchema = createInsertSchema(userDocuments).omit({ id: true });
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({ id: true });
export const insertTemplateSubmissionSchema = createInsertSchema(templateSubmissions).omit({ id: true });
export const insertBusinessSetupSchema = createInsertSchema(businessSetup).omit({ id: true });
export const insertAiTrainingDataSchema = createInsertSchema(aiTrainingData).omit({ id: true });
export const insertDocumentTypeSchema = createInsertSchema(documentTypes).omit({ id: true });
export const insertSaifZoneFormSchema = createInsertSchema(saifZoneForms).omit({ id: true });
export const insertAssistantMemorySchema = createInsertSchema(assistantMemory).omit({ id: true });
export const insertIssuesLogSchema = createInsertSchema(issuesLog).omit({ id: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertWebResearchItemSchema = createInsertSchema(webResearchItems).omit({ id: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true });
export const insertUserInteractionSchema = createInsertSchema(userInteractions).omit({ id: true });
export const insertApiGatewaySchema = createInsertSchema(apiGateways).omit({ id: true });
export const insertApiRouteSchema = createInsertSchema(apiRoutes).omit({ id: true });
export const insertAdminDashboardSchema = createInsertSchema(adminDashboards).omit({ id: true });
export const insertAdminDashboardWidgetSchema = createInsertSchema(adminDashboardWidgets).omit({ id: true });
export const insertConversationInterfaceSchema = createInsertSchema(conversationInterfaces).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type FreeZone = typeof freeZones.$inferSelect;
export type BusinessActivity = typeof businessActivities.$inferSelect;
export type BusinessActivityCategory = typeof businessActivityCategories.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type UserDocument = typeof userDocuments.$inferSelect;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type TemplateSubmission = typeof templateSubmissions.$inferSelect;
export type BusinessSetup = typeof businessSetup.$inferSelect;
export type AiTrainingData = typeof aiTrainingData.$inferSelect;
export type DocumentType = typeof documentTypes.$inferSelect;
export type SaifZoneForm = typeof saifZoneForms.$inferSelect;
export type AssistantMemory = typeof assistantMemory.$inferSelect;
export type IssuesLog = typeof issuesLog.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type WebResearchItem = typeof webResearchItems.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type UserInteraction = typeof userInteractions.$inferSelect;
export type ApiGateway = typeof apiGateways.$inferSelect;
export type ApiRoute = typeof apiRoutes.$inferSelect;
export type AdminDashboard = typeof adminDashboards.$inferSelect;
export type AdminDashboardWidget = typeof adminDashboardWidgets.$inferSelect;
export type ConversationInterface = typeof conversationInterfaces.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFreeZone = z.infer<typeof insertFreeZoneSchema>;
export type InsertBusinessActivity = z.infer<typeof insertBusinessActivitySchema>;
export type InsertBusinessActivityCategory = z.infer<typeof insertBusinessActivityCategorySchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertUserDocument = z.infer<typeof insertUserDocumentSchema>;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;
export type InsertTemplateSubmission = z.infer<typeof insertTemplateSubmissionSchema>;
export type InsertBusinessSetup = z.infer<typeof insertBusinessSetupSchema>;
export type InsertAiTrainingData = z.infer<typeof insertAiTrainingDataSchema>;
export type InsertDocumentType = z.infer<typeof insertDocumentTypeSchema>;
export type InsertSaifZoneForm = z.infer<typeof insertSaifZoneFormSchema>;
export type InsertAssistantMemory = z.infer<typeof insertAssistantMemorySchema>;
export type InsertIssuesLog = z.infer<typeof insertIssuesLogSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertWebResearchItem = z.infer<typeof insertWebResearchItemSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type InsertUserInteraction = z.infer<typeof insertUserInteractionSchema>;
export type InsertApiGateway = z.infer<typeof insertApiGatewaySchema>;
export type InsertApiRoute = z.infer<typeof insertApiRouteSchema>;
export type InsertAdminDashboard = z.infer<typeof insertAdminDashboardSchema>;
export type InsertAdminDashboardWidget = z.infer<typeof insertAdminDashboardWidgetSchema>;
export type InsertConversationInterface = z.infer<typeof insertConversationInterfaceSchema>;