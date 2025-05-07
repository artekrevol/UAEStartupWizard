import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Free Zones table stores information about UAE free zones
 */
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
  lastUpdated: timestamp('last_updated').defaultNow(),
  status: text('status').default('active'),
  logoUrl: text('logo_url'),
  contactInfo: jsonb('contact_info').default({}),
  officeLocations: jsonb('office_locations').default([]),
  establishmentYear: integer('establishment_year'),
  featuredImageUrl: text('featured_image_url'),
  slug: text('slug'),
  isPromoted: boolean('is_promoted').default(false),
});

/**
 * Business Activity Categories table
 */
export const businessActivityCategories = pgTable('business_activity_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  parentId: integer('parent_id'),
  isicCode: text('isic_code'),
  status: text('status').default('active'),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  iconUrl: text('icon_url'),
});

/**
 * Business Activities table
 */
export const businessActivities = pgTable('business_activities', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id'),
  name: text('name').notNull(),
  code: text('code'),
  description: text('description'),
  requirements: text('requirements'),
  feeStructure: jsonb('fee_structure').default({}),
  applicableIn: jsonb('applicable_in').default([]),
  restrictions: text('restrictions'),
  approvalTime: text('approval_time'),
  approvalRequirements: text('approval_requirements'),
  isicCode: text('isic_code'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * License Types table
 */
export const licenseTypes = pgTable('license_types', {
  id: serial('id').primaryKey(),
  freeZoneId: integer('free_zone_id'),
  name: text('name').notNull(),
  description: text('description'),
  validityPeriod: text('validity_period'),
  renewalRequirements: text('renewal_requirements'),
  cost: jsonb('cost').default({}),
  benefits: jsonb('benefits').default([]),
  eligibility: text('eligibility'),
  restrictions: text('restrictions'),
  documentRequirements: jsonb('document_requirements').default([]),
  processingTime: text('processing_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Legal Forms table
 */
export const legalForms = pgTable('legal_forms', {
  id: serial('id').primaryKey(),
  freeZoneId: integer('free_zone_id'),
  name: text('name').notNull(),
  description: text('description'),
  minimumShareholders: integer('minimum_shareholders'),
  maximumShareholders: integer('maximum_shareholders'),
  minimumDirectors: integer('minimum_directors'),
  minimumCapital: jsonb('minimum_capital').default({}),
  liabilityType: text('liability_type'),
  taxImplications: text('tax_implications'),
  benefits: jsonb('benefits').default([]),
  restrictions: text('restrictions'),
  documentRequirements: jsonb('document_requirements').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Establishment Guides table
 */
export const establishmentGuides = pgTable('establishment_guides', {
  id: serial('id').primaryKey(),
  freeZoneId: integer('free_zone_id'),
  title: text('title').notNull(),
  content: text('content'),
  stepByStep: jsonb('step_by_step').default([]),
  timeframe: text('timeframe'),
  costBreakdown: jsonb('cost_breakdown').default({}),
  tips: jsonb('tips').default([]),
  requiredDocuments: jsonb('required_documents').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
  status: text('status').default('published'),
  slug: text('slug'),
  featuredImageUrl: text('featured_image_url'),
});

/**
 * Free Zone Comparisons table
 */
export const freeZoneComparisons = pgTable('free_zone_comparisons', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  freeZonesCompared: jsonb('free_zones_compared').default([]),
  comparisonData: jsonb('comparison_data').default({}),
  conclusion: text('conclusion'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by'),
  status: text('status').default('published'),
  tags: jsonb('tags').default([]),
  slug: text('slug'),
  viewCount: integer('view_count').default(0),
});

/**
 * Free Zone Incentives table
 */
export const freeZoneIncentives = pgTable('free_zone_incentives', {
  id: serial('id').primaryKey(),
  freeZoneId: integer('free_zone_id'),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  validityPeriod: text('validity_period'),
  eligibility: text('eligibility'),
  applicationProcess: text('application_process'),
  termsAndConditions: text('terms_and_conditions'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Free Zone Reviews table
 */
export const freeZoneReviews = pgTable('free_zone_reviews', {
  id: serial('id').primaryKey(),
  freeZoneId: integer('free_zone_id').notNull(),
  userId: integer('user_id').notNull(),
  rating: integer('rating').notNull(),
  title: text('title'),
  content: text('content'),
  pros: jsonb('pros').default([]),
  cons: jsonb('cons').default([]),
  verificationStatus: text('verification_status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  helpfulCount: integer('helpful_count').default(0),
  reportCount: integer('report_count').default(0),
  isVisible: boolean('is_visible').default(true),
});

// Schema definitions for insert operations
export const insertFreeZoneSchema = createInsertSchema(freeZones).omit({ id: true });
export const insertBusinessActivityCategorySchema = createInsertSchema(businessActivityCategories).omit({ id: true });
export const insertBusinessActivitySchema = createInsertSchema(businessActivities).omit({ id: true });
export const insertLicenseTypeSchema = createInsertSchema(licenseTypes).omit({ id: true });
export const insertLegalFormSchema = createInsertSchema(legalForms).omit({ id: true });
export const insertEstablishmentGuideSchema = createInsertSchema(establishmentGuides).omit({ id: true });
export const insertFreeZoneComparisonSchema = createInsertSchema(freeZoneComparisons).omit({ id: true });
export const insertFreeZoneIncentiveSchema = createInsertSchema(freeZoneIncentives).omit({ id: true });
export const insertFreeZoneReviewSchema = createInsertSchema(freeZoneReviews).omit({ id: true });

// Type definitions
export type FreeZone = typeof freeZones.$inferSelect;
export type BusinessActivityCategory = typeof businessActivityCategories.$inferSelect;
export type BusinessActivity = typeof businessActivities.$inferSelect;
export type LicenseType = typeof licenseTypes.$inferSelect;
export type LegalForm = typeof legalForms.$inferSelect;
export type EstablishmentGuide = typeof establishmentGuides.$inferSelect;
export type FreeZoneComparison = typeof freeZoneComparisons.$inferSelect;
export type FreeZoneIncentive = typeof freeZoneIncentives.$inferSelect;
export type FreeZoneReview = typeof freeZoneReviews.$inferSelect;

export type InsertFreeZone = z.infer<typeof insertFreeZoneSchema>;
export type InsertBusinessActivityCategory = z.infer<typeof insertBusinessActivityCategorySchema>;
export type InsertBusinessActivity = z.infer<typeof insertBusinessActivitySchema>;
export type InsertLicenseType = z.infer<typeof insertLicenseTypeSchema>;
export type InsertLegalForm = z.infer<typeof insertLegalFormSchema>;
export type InsertEstablishmentGuide = z.infer<typeof insertEstablishmentGuideSchema>;
export type InsertFreeZoneComparison = z.infer<typeof insertFreeZoneComparisonSchema>;
export type InsertFreeZoneIncentive = z.infer<typeof insertFreeZoneIncentiveSchema>;
export type InsertFreeZoneReview = z.infer<typeof insertFreeZoneReviewSchema>;