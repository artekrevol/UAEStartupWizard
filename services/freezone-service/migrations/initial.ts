/**
 * Free Zone Service - Initial Database Migration
 * Creates the necessary tables for the Free Zone service
 */
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { freeZones, freeZoneIncentives, freeZoneReviews } from '../schema';
import { logger } from '../../../shared/logger';

export async function runMigration() {
  try {
    logger.info('Starting Free Zone Service database migration', {
      service: 'freezone-service'
    });

    // Create tables if they don't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS free_zones (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        location TEXT,
        benefits JSONB DEFAULT '{}',
        requirements JSONB DEFAULT '{}',
        industries JSONB DEFAULT '{}',
        license_types JSONB DEFAULT '{}',
        facilities JSONB DEFAULT '{}',
        website TEXT,
        setup_cost JSONB DEFAULT '{}',
        faqs JSONB DEFAULT '{}',
        last_updated TIMESTAMP DEFAULT NOW(),
        status TEXT DEFAULT 'active',
        logo_url TEXT,
        contact_info JSONB DEFAULT '{}',
        office_locations JSONB DEFAULT '[]',
        establishment_year INTEGER,
        featured_image_url TEXT,
        slug TEXT,
        is_promoted BOOLEAN DEFAULT FALSE
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS business_activity_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parent_id INTEGER REFERENCES business_activity_categories(id) ON DELETE SET NULL,
        level INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        free_zone_id INTEGER REFERENCES free_zones(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS business_activities (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category_id INTEGER REFERENCES business_activity_categories(id) ON DELETE CASCADE,
        activity_code TEXT,
        fee_structure JSONB DEFAULT '{}',
        requirements JSONB DEFAULT '{}',
        is_allowed_in_mainland BOOLEAN DEFAULT TRUE,
        is_allowed_in_free_zone BOOLEAN DEFAULT TRUE,
        free_zone_id INTEGER REFERENCES free_zones(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS free_zone_incentives (
        id SERIAL PRIMARY KEY,
        free_zone_id INTEGER REFERENCES free_zones(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        validity_period TEXT,
        eligibility TEXT,
        application_process TEXT,
        terms_and_conditions TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS free_zone_reviews (
        id SERIAL PRIMARY KEY,
        free_zone_id INTEGER NOT NULL REFERENCES free_zones(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        title TEXT,
        content TEXT,
        pros JSONB DEFAULT '[]',
        cons JSONB DEFAULT '[]',
        verification_status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        helpful_count INTEGER DEFAULT 0,
        report_count INTEGER DEFAULT 0,
        is_visible BOOLEAN DEFAULT TRUE
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS free_zone_comparisons (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        free_zone_ids INTEGER[] NOT NULL,
        name TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    logger.info('Free Zone Service database migration completed successfully', {
      service: 'freezone-service'
    });
  } catch (error: any) {
    logger.error('Free Zone Service database migration failed', {
      service: 'freezone-service',
      error: error.message
    });
    throw error;
  }
}