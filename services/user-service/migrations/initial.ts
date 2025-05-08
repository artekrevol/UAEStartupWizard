/**
 * Initial User Service Migration
 * 
 * This migration creates all the necessary tables for the user service
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { config } from '../../../shared/config';

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.database.url,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeoutMillis
});

// Initialize Drizzle ORM
const db = drizzle(pool);

/**
 * Run migrations
 */
export async function runMigrations() {
  try {
    console.log('[UserService:Migration] Starting database migrations...');
    
    // Create user table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(50) UNIQUE,
        password TEXT NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        profile_picture_url TEXT,
        company VARCHAR(255),
        position VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        newsletter_subscribed BOOLEAN DEFAULT FALSE,
        preferences JSONB DEFAULT '{}',
        verified BOOLEAN DEFAULT FALSE,
        verification_token TEXT,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMP,
        last_login TIMESTAMP,
        last_active TIMESTAMP,
        login_attempts INTEGER DEFAULT 0,
        lock_until TIMESTAMP,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret TEXT,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    `);
    console.log('[UserService:Migration] Created users table');
    
    // Create user profiles table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        country VARCHAR(100),
        language VARCHAR(50) DEFAULT 'en',
        timezone VARCHAR(50) DEFAULT 'UTC',
        website_url TEXT,
        social_links JSONB DEFAULT '{}',
        skills JSONB DEFAULT '[]',
        interests JSONB DEFAULT '[]',
        industry VARCHAR(100),
        experience JSONB DEFAULT '[]',
        education JSONB DEFAULT '[]',
        settings JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
    `);
    console.log('[UserService:Migration] Created user_profiles table');
    
    // Create user sessions table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        location JSONB DEFAULT '{}',
        device VARCHAR(100),
        browser VARCHAR(100),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        last_active TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
    `);
    console.log('[UserService:Migration] Created user_sessions table');
    
    // Create audit logs table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id VARCHAR(255),
        details JSONB DEFAULT '{}',
        ip_address VARCHAR(50),
        user_agent TEXT,
        timestamp TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    `);
    console.log('[UserService:Migration] Created audit_logs table');
    
    // Create user notifications table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        action_url TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
      CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);
    `);
    console.log('[UserService:Migration] Created user_notifications table');
    
    console.log('[UserService:Migration] Database migrations completed successfully!');
  } catch (error) {
    console.error('[UserService:Migration] Migration failed:', error);
    throw error;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// If this file is run directly (not imported), run migrations
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[UserService:Migration] Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[UserService:Migration] Migration script failed:', error);
      process.exit(1);
    });
}