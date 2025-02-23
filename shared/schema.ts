import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  companyName: text("company_name"),
  progress: integer("progress").default(0),
});

export const businessSetups = pgTable("business_setups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessType: text("business_type").notNull(),
  legalForm: text("legal_form"),
  initialCapital: integer("initial_capital"),
  sharePercentage: integer("share_percentage"),
  freeZone: text("free_zone"),
  requirements: jsonb("requirements"),
  documents: jsonb("documents"),
  businessActivity: text("business_activity"),
  activityDescription: text("activity_description"),
  approvalStatus: text("approval_status").default("pending"),
  establishmentSteps: jsonb("establishment_steps"),
  status: text("status").default("pending"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  companyName: true,
});

export const businessSetupSchema = createInsertSchema(businessSetups);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type BusinessSetup = typeof businessSetups.$inferSelect;

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