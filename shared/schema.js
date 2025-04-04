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

// Business Setup table
export const businessSetups = pgTable("business_setups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  businessType: text("business_type"),
  businessName: text("business_name"),
  industry: text("industry"),
  location: text("location"),
  initialCapital: integer("initial_capital"),
  structure: text("structure"),
  requirements: jsonb("requirements"),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Free Zones table
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
  setupCosts: jsonb("setup_costs"),
  contactInfo: jsonb("contact_info"),
  faqs: jsonb("faqs"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBusinessSetupSchema = createInsertSchema(businessSetups).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFreeZoneSchema = createInsertSchema(freeZones).omit({ id: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });

// Export types (for TypeScript compatibility, these won't be used in JS)
const dummyInfer = (schema) => schema;
const dummySelect = { $inferSelect: null };

export const InsertUser = dummyInfer(insertUserSchema);
export const User = dummySelect;
export const InsertBusinessSetup = dummyInfer(insertBusinessSetupSchema);
export const BusinessSetup = dummySelect;
export const InsertFreeZone = dummyInfer(insertFreeZoneSchema);
export const FreeZone = dummySelect;
export const Document = dummySelect;
export const InsertDocument = dummyInfer(insertDocumentSchema);

// Constants for business setup
export const LEGAL_FORMS = [
  "Limited Liability Company (LLC)",
  "Sole Proprietorship",
  "Civil Company",
  "Branch of Foreign Company",
  "Free Zone Company",
  "Public Joint Stock Company (PJSC)",
  "Private Joint Stock Company"
];

export const ESTABLISHMENT_STEPS = [
  "Initial Approval",
  "Name Reservation",
  "Legal Form Selection",
  "Document Submission",
  "Payment of Fees",
  "License Issuance",
  "Additional Approvals",
  "Final Registration"
];

export const APPROVAL_STATUS = [
  "pending",
  "document_review",
  "initial_approval",
  "final_approval",
  "rejected"
];

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
};

// License Types from MOEC
export const LICENSE_TYPES = [
  "Commercial License",
  "Professional License",
  "Industrial License",
  "Tourism License",
  "E-commerce License"
];