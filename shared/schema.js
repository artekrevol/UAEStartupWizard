import { pgTable, text, serial, integer, jsonb, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
export const insertFreeZoneSchema = createInsertSchema(freeZones).omit({ id: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });

// Export types (for TypeScript compatibility, these won't be used in JS)
const dummyInfer = (schema) => schema;
const dummySelect = { $inferSelect: null };

export const InsertFreeZone = dummyInfer(insertFreeZoneSchema);
export const FreeZone = dummySelect;
export const Document = dummySelect;
export const InsertDocument = dummyInfer(insertDocumentSchema);