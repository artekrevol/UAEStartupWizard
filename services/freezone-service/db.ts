/**
 * Database connection for the Free Zone Service
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../../shared/config';
import { logger } from '../../shared/logger';

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.freezoneService.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Register pool error handler
pool.on('error', (err) => {
  logger.error('PostgreSQL pool error in FreeZone Service', {
    service: 'freezone-service',
    error: err.message,
    stack: err.stack
  });
});

// Test the database connection
pool.query('SELECT NOW()')
  .then(() => {
    logger.info('Successfully connected to the FreeZone Service database', {
      service: 'freezone-service'
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to the FreeZone Service database', {
      service: 'freezone-service',
      error: err.message,
      stack: err.stack
    });
  });

// Initialize Drizzle ORM with the connection pool
export const db = drizzle(pool);

// Handle process termination gracefully
process.on('SIGINT', async () => {
  try {
    await pool.end();
    logger.info('Database connection pool closed', {
      service: 'freezone-service'
    });
  } catch (err) {
    logger.error('Error closing database connection pool', {
      service: 'freezone-service',
      error: err.message
    });
  }
});