/**
 * Database Connection
 * 
 * Sets up the PostgreSQL connection for the User Service
 */
import { Pool } from 'pg';
import { config } from '../../shared/config';

// Create PostgreSQL connection pool
export const pool = new Pool({
  connectionString: config.database.url,
  max: config.database.poolSize,
  idleTimeoutMillis: config.database.idleTimeoutMs,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[Database] Connection error:', err.message);
  } else {
    console.log(`[Database] Connected successfully at ${res.rows[0].now}`);
  }
});

// Handle unexpected errors
pool.on('error', (err) => {
  console.error('[Database] Unexpected error on idle client:', err.message);
});

// Handle process termination
process.on('SIGINT', () => {
  pool.end(() => {
    console.log('[Database] Pool has ended');
    process.exit(0);
  });
});

export default pool;