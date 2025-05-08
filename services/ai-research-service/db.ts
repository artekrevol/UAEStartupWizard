/**
 * Database Connection for AI Research Service
 * 
 * This module establishes a connection to the shared database and provides access to
 * Drizzle ORM functionality for the AI Research Service.
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../../shared/schema';
// Import custom logger when available
// For now use console
const logger = {
  info: (message: string) => console.log(`[ai-research-service] INFO: ${message}`),
  error: (message: string, error?: any) => console.error(`[ai-research-service] ERROR: ${message}`, error),
  warn: (message: string) => console.warn(`[ai-research-service] WARN: ${message}`),
  debug: (message: string) => console.log(`[ai-research-service] DEBUG: ${message}`)
};

// Configure neon to use websockets
neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL is not set. This will cause database operations to fail.');
}

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Initialize the database connection
 */
export function initializeDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set.');
    }
    
    // Create connection pool
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Initialize Drizzle ORM
    db = drizzle({ client: pool, schema });
    
    logger.info('Database connection initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database connection:', error);
    throw error;
  }
}

/**
 * Get the database instance
 * Initialize it if not already done
 */
export function getDb() {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Close the database connection
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
}

// Initialize database on module load
if (!db && process.env.DATABASE_URL) {
  initializeDatabase();
}

export { pool, db };