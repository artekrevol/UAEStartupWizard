/**
 * User Service - Initial Database Migration
 * Creates all the necessary tables for the User service
 */
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { users, sessions, userProfiles, auditLogs, notifications } from '../schema';
import { logger } from '../../../shared/logger';

/**
 * Run the initial database migration for User Service
 * Creates all required tables if they don't exist
 */
export async function runMigration() {
  try {
    logger.info('Starting User Service database migration', {
      service: 'user-service'
    });

    // Users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP,
        profile_picture_url TEXT,
        company VARCHAR(255),
        position VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        newsletter_subscribed BOOLEAN DEFAULT FALSE,
        preferences JSONB DEFAULT '{}',
        reset_password_token TEXT,
        reset_password_expires TIMESTAMP,
        verification_token TEXT,
        verified BOOLEAN DEFAULT FALSE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret TEXT,
        refresh_token TEXT,
        login_attempts INTEGER DEFAULT 0,
        lock_until TIMESTAMP
      );
    `);

    // Sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
        device_info JSONB DEFAULT '{}'
      );
    `);

    // User Profiles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        bio TEXT,
        country VARCHAR(100),
        language VARCHAR(50) DEFAULT 'en',
        timezone VARCHAR(50) DEFAULT 'UTC',
        industry VARCHAR(100),
        company_size VARCHAR(50),
        business_type VARCHAR(100),
        website_url TEXT,
        social_links JSONB DEFAULT '{}',
        interests JSONB DEFAULT '[]',
        skills JSONB DEFAULT '[]',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Audit Logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id VARCHAR(100),
        ip_address VARCHAR(45),
        user_agent TEXT,
        details JSONB DEFAULT '{}',
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Notifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        link TEXT,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP
      );
    `);

    logger.info('User Service database migration completed successfully', {
      service: 'user-service'
    });
  } catch (error: any) {
    logger.error('User Service database migration failed', {
      service: 'user-service',
      error: error.message
    });
    throw error;
  }
}