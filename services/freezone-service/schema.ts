/**
 * Freezone Service Database Schema
 * 
 * Defines the database schema specific to the Freezone Service
 */
import { pgTable, serial, text, integer, timestamp, jsonb, boolean, foreignKey } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { BusinessActivityCategory } from '../../shared/types';

// Free zones information
export const freeZones = pgTable('free_zones', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  location: text('location'),
  benefits: jsonb('benefits').default({}),
  requirements: jsonb('requirements').default({}),
  industries: jsonb('industries').default({}),
  license_types: jsonb('license_types').default({}),
  facilities: jsonb('facilities').default({}),
  website: text('website'),
  setup_cost: jsonb('setup_cost').default({}),
  faqs: jsonb('faqs').default({}),
  last_updated: timestamp('last_updated'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Business activity categories
export const businessActivityCategories = pgTable('business_activity_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  parent_id: integer('parent_id').references(() => businessActivityCategories.id),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Business activities
export const businessActivities = pgTable('business_activities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  category_id: integer('category_id').references(() => businessActivityCategories.id),
  industry_group: text('industry_group'),
  requirements: text('requirements'),
  fee_structure: jsonb('fee_structure').default({}),
  permitted_free_zones: jsonb('permitted_free_zones').default([]),
  restrictions: text('restrictions'),
  approval_time: text('approval_time'),
  special_approvals: boolean('special_approvals').default(false),
  approving_authority: text('approving_authority'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Free zone license types
export const licenseTypes = pgTable('license_types', {
  id: serial('id').primaryKey(),
  free_zone_id: integer('free_zone_id').references(() => freeZones.id),
  name: text('name').notNull(),
  description: text('description'),
  requirements: jsonb('requirements').default({}),
  fees: jsonb('fees').default({}),
  validity_period: text('validity_period'),
  renewal_process: text('renewal_process'),
  eligible_activities: jsonb('eligible_activities').default([]),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Legal entity forms in free zones
export const legalForms = pgTable('legal_forms', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  requirements: jsonb('requirements').default({}),
  available_in_free_zones: jsonb('available_in_free_zones').default([]),
  shareholder_requirements: text('shareholder_requirements'),
  capital_requirements: text('capital_requirements'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Establishment guides for different entity types
export const establishmentGuides = pgTable('establishment_guides', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  entity_type: text('entity_type').notNull(),
  free_zone_id: integer('free_zone_id').references(() => freeZones.id),
  steps: jsonb('steps').default([]),
  requirements: jsonb('requirements').default({}),
  timeline: text('timeline'),
  estimated_cost: jsonb('estimated_cost').default({}),
  document_checklist: jsonb('document_checklist').default([]),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at')
});

// Comparison records for free zone comparisons
export const freeZoneComparisons = pgTable('free_zone_comparisons', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id'),
  free_zones: jsonb('free_zones').default([]),
  business_activity_id: integer('business_activity_id').references(() => businessActivities.id),
  results: jsonb('results').default({}),
  created_at: timestamp('created_at').defaultNow()
});

// Schemas for validation
export const insertFreeZoneSchema = createInsertSchema(freeZones).omit({ id: true });
export const insertBusinessActivityCategorySchema = createInsertSchema(businessActivityCategories).omit({ id: true });
export const insertBusinessActivitySchema = createInsertSchema(businessActivities).omit({ id: true });
export const insertLicenseTypeSchema = createInsertSchema(licenseTypes).omit({ id: true });
export const insertLegalFormSchema = createInsertSchema(legalForms).omit({ id: true });
export const insertEstablishmentGuideSchema = createInsertSchema(establishmentGuides).omit({ id: true });
export const insertFreeZoneComparisonSchema = createInsertSchema(freeZoneComparisons).omit({ id: true });

// Extended schemas with additional validation
export const businessActivityCategorySchema = insertBusinessActivityCategorySchema.extend({
  name: z.enum([BusinessActivityCategory.TECHNOLOGY, BusinessActivityCategory.FINANCE,
                 BusinessActivityCategory.RETAIL, BusinessActivityCategory.MANUFACTURING,
                 BusinessActivityCategory.SERVICES, BusinessActivityCategory.LOGISTICS,
                 BusinessActivityCategory.MEDIA, BusinessActivityCategory.HEALTHCARE,
                 BusinessActivityCategory.EDUCATION, BusinessActivityCategory.OTHER])
});

// Types for database interactions
export type FreeZone = typeof freeZones.$inferSelect;
export type BusinessActivityCategory = typeof businessActivityCategories.$inferSelect;
export type BusinessActivity = typeof businessActivities.$inferSelect;
export type LicenseType = typeof licenseTypes.$inferSelect;
export type LegalForm = typeof legalForms.$inferSelect;
export type EstablishmentGuide = typeof establishmentGuides.$inferSelect;
export type FreeZoneComparison = typeof freeZoneComparisons.$inferSelect;

export type InsertFreeZone = z.infer<typeof insertFreeZoneSchema>;
export type InsertBusinessActivityCategory = z.infer<typeof insertBusinessActivityCategorySchema>;
export type InsertBusinessActivity = z.infer<typeof insertBusinessActivitySchema>;
export type InsertLicenseType = z.infer<typeof insertLicenseTypeSchema>;
export type InsertLegalForm = z.infer<typeof insertLegalFormSchema>;
export type InsertEstablishmentGuide = z.infer<typeof insertEstablishmentGuideSchema>;
export type InsertFreeZoneComparison = z.infer<typeof insertFreeZoneComparisonSchema>;
