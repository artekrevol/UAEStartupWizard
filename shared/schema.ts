import { pgTable, text, serial, integer, jsonb, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  companyName: text("company_name"),
  progress: integer("progress").default(0),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Business Categories and Activities
export const businessCategories = pgTable("business_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
});

export const businessActivities = pgTable("business_activities", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .references(() => businessCategories.id),  // categoryId made nullable in the database
  activityCode: text("activity_code").notNull().unique(),
  name: text("name").notNull(),
  nameArabic: text("name_arabic"),
  description: text("description"),
  descriptionArabic: text("description_arabic"),
  industryGroup: text("industry_group"),
  isicActivity: text("isic_activity"),
  requiredDocs: jsonb("required_docs"),
  minimumCapital: integer("minimum_capital"),
  fees: jsonb("fees"),
  approvalRequirements: jsonb("approval_requirements"),
});

// Legal Forms and Requirements
export const legalForms = pgTable("legal_forms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  minimumShareholders: integer("minimum_shareholders"),
  maximumShareholders: integer("maximum_shareholders"),
  minimumCapital: integer("minimum_capital"),
  localOwnershipRequired: boolean("local_ownership_required"),
  localOwnershipPercentage: real("local_ownership_percentage"),
  requiredDocs: jsonb("required_docs"),
  fees: jsonb("fees"),
});

// Business Setup Applications
export const businessSetups = pgTable("business_setups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  businessType: text("business_type").notNull(),
  legalForm: text("legal_form"),
  initialCapital: integer("initial_capital"),
  sharePercentage: integer("share_percentage"),
  freeZone: text("free_zone"),
  requirements: jsonb("requirements"),
  documents: jsonb("documents"),
  businessActivity: text("business_activity"),
  activityDescription: text("activity_description"),
  licenseType: text("license_type"),
  approvalStatus: text("approval_status").default("pending"),
  establishmentSteps: jsonb("establishment_steps"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Document Requirements
export const documentTypes = pgTable("document_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isRequired: boolean("is_required").default(true),
  validityPeriod: integer("validity_period_months"),
  attestationRequired: boolean("attestation_required"),
});

// AI Training Data
export const aiTrainingData = pgTable("ai_training_data", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  context: jsonb("context"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Conversations for memory and context
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(),
  summary: text("summary"),
  metadata: jsonb("metadata"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Conversation Messages
export const conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  tokenCount: integer("token_count"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// AI Setup Flow Steps - for guided business setup
export const setupFlowSteps = pgTable("setup_flow_steps", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  stepNumber: integer("step_number").notNull(),
  category: text("category").notNull(),
  requiredFields: jsonb("required_fields"),
  nextStepId: integer("next_step_id"),
  aiPrompt: text("ai_prompt"),
  isActive: boolean("is_active").default(true),
});

// Free Zones Information
export const freeZones = pgTable("free_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  benefits: jsonb("benefits"),
  requirements: jsonb("requirements"),
  industries: jsonb("industries"),
  licenseTypes: jsonb("license_types"),
  facilities: jsonb("facilities"),
  website: text("website"),
  setupCost: jsonb("setup_cost"),
  faqs: jsonb("faqs"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Company Establishment Guidelines
export const establishmentGuides = pgTable("establishment_guides", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  requirements: jsonb("requirements"),
  documents: jsonb("documents"),
  steps: jsonb("steps"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  companyName: true,
});

export const businessSetupSchema = createInsertSchema(businessSetups);
export const insertFreeZoneSchema = createInsertSchema(freeZones);
export const insertEstablishmentGuideSchema = createInsertSchema(establishmentGuides);

// Conversation related schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true });
export const insertMessageSchema = createInsertSchema(conversationMessages).omit({ id: true });
export const insertSetupFlowStepSchema = createInsertSchema(setupFlowSteps).omit({ id: true });

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  documentType: text("document_type"),
  category: text("category"),
  subcategory: text("subcategory"),
  freeZoneId: integer("free_zone_id").references(() => freeZones.id),
  metadata: jsonb("metadata"),
  content: text("content"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Create document insert schema
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type BusinessSetup = typeof businessSetups.$inferSelect;
export type FreeZone = typeof freeZones.$inferSelect;
export type EstablishmentGuide = typeof establishmentGuides.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// Conversation and AI Assistant related types
export type Conversation = typeof conversations.$inferSelect;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type SetupFlowStep = typeof setupFlowSteps.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertSetupFlowStep = z.infer<typeof insertSetupFlowStepSchema>;

// SAIF Zone Forms table for specialized forms and documents
export const saifZoneForms = pgTable("saif_zone_forms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  formType: text("form_type"), // application, guideline, brochure, etc.
  description: text("description"),
  language: text("language").default("english"),
  version: text("version"),
  isActive: boolean("is_active").default(true),
  downloadUrl: text("download_url"),
  metadata: jsonb("metadata"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Create SAIF Zone form insert schema
export const insertSaifZoneFormSchema = createInsertSchema(saifZoneForms).omit({ id: true });
export type InsertSaifZoneForm = z.infer<typeof insertSaifZoneFormSchema>;
export type SaifZoneForm = typeof saifZoneForms.$inferSelect;

// Issues log for tracking user behavior and errors
export const issuesLog = pgTable("issues_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(), // "error", "crash", "behavior", "performance"
  severity: text("severity").notNull(), // "low", "medium", "high", "critical"
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  url: text("url"),
  userAgent: text("user_agent"),
  component: text("component"),
  action: text("action"),
  metadata: jsonb("metadata"),
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertIssuesLogSchema = createInsertSchema(issuesLog).omit({ id: true });
export type InsertIssuesLog = z.infer<typeof insertIssuesLogSchema>;
export type IssuesLog = typeof issuesLog.$inferSelect;

// Constants for business setup
export const LEGAL_FORMS = [
  "Limited Liability Company (LLC)",
  "Sole Proprietorship",
  "Civil Company",
  "Branch of Foreign Company",
  "Free Zone Company",
  "Public Joint Stock Company (PJSC)",
  "Private Joint Stock Company"
] as const;

export const ESTABLISHMENT_STEPS = [
  "Initial Approval",
  "Name Reservation",
  "Legal Form Selection",
  "Document Submission",
  "Payment of Fees",
  "License Issuance",
  "Additional Approvals",
  "Final Registration"
] as const;

export const APPROVAL_STATUS = [
  "pending",
  "document_review",
  "initial_approval",
  "final_approval",
  "rejected"
] as const;

// Business Activities Categories from MOEC
export const BUSINESS_CATEGORIES = {
  "Manufacturing": [
    "Food & Beverages",
    "Textiles & Clothing",
    "Chemical Products",
    "Electronics & Electrical",
    "Metal Products",
    "Pharmaceuticals"
  ],
  "Trading": [
    "General Trading",
    "Import/Export",
    "Wholesale",
    "Retail",
    "E-commerce",
    "Specialized Trading"
  ],
  "Professional Services": [
    "Legal Services",
    "Accounting & Auditing",
    "Engineering",
    "Architecture",
    "Management Consulting",
    "Healthcare"
  ],
  "Construction": [
    "Building Construction",
    "Civil Engineering",
    "Specialized Construction",
    "Real Estate Development",
    "MEP Services",
    "Interior Design"
  ],
  "Technology": [
    "Software Development",
    "IT Services",
    "Digital Solutions",
    "AI & Data Analytics",
    "Cybersecurity",
    "Cloud Services"
  ]
} as const;

// License Types from MOEC
export const LICENSE_TYPES = [
  "Commercial License",
  "Professional License",
  "Industrial License",
  "Tourism License",
  "E-commerce License"
] as const;