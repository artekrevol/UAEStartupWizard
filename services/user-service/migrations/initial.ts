/**
 * Initial Migration for User Service
 * 
 * This migration creates all the necessary tables for the User Service
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { config } from '../../../shared/config';
import * as schema from '../schema';
import path from 'path';

async function runMigration() {
  console.log('[Migration] Starting initial migration for User Service...');
  
  // Create a dedicated connection for migrations
  const pool = new Pool({
    connectionString: config.database.url,
    max: config.database.poolSize,
    idleTimeoutMillis: config.database.idleTimeoutMs,
  });
  
  try {
    const db = drizzle(pool, { schema });
    
    // Check if users table already exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('[Migration] Tables already exist. Skipping initial migration.');
      return;
    }
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        verified BOOLEAN NOT NULL DEFAULT false,
        verification_token VARCHAR(255),
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        last_login_at TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        two_factor_enabled BOOLEAN DEFAULT false,
        two_factor_secret VARCHAR(255),
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create user_profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        avatar VARCHAR(255),
        company VARCHAR(100),
        position VARCHAR(100),
        location VARCHAR(100),
        phone VARCHAR(50),
        website VARCHAR(255),
        social_links JSONB DEFAULT '{}',
        time_zone VARCHAR(50),
        language VARCHAR(10) DEFAULT 'en',
        date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `);
    
    // Create user_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        refresh_token VARCHAR(255),
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(50),
        user_agent VARCHAR(255),
        device_info JSONB DEFAULT '{}',
        is_revoked BOOLEAN DEFAULT false,
        last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create user_notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create audit_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(50),
        details JSONB DEFAULT '{}',
        ip_address VARCHAR(50),
        user_agent VARCHAR(255),
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create indexes for better query performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    `);
    
    console.log('[Migration] Initial migration completed successfully.');
    
    // Create super admin user if it doesn't exist
    const adminExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM users
        WHERE email = 'admin@example.com'
      );
    `);
    
    if (!adminExists.rows[0].exists) {
      // Hash password using bcrypt
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Insert super admin user
      await pool.query(`
        INSERT INTO users (
          username, email, password, first_name, last_name, 
          role, status, verified, created_at, updated_at
        ) VALUES (
          'admin', 'admin@example.com', $1, 'System', 'Administrator',
          'superadmin', 'active', true, NOW(), NOW()
        );
      `, [hashedPassword]);
      
      console.log('[Migration] Created default superadmin user: admin@example.com');
    }
    
  } catch (err) {
    console.error('[Migration] Error during migration:', err);
    throw err;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('[Migration] Process completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Migration] Process failed:', err);
      process.exit(1);
    });
}

export { runMigration };