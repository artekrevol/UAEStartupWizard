import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '../schema';
import { DatabaseException } from '../../../shared/errors';

// Configure WebSocket for Neon connection
neonConfig.webSocketConstructor = ws;

// Get database connection URL from environment
const getConnectionUrl = (): string => {
  const connectionUrl = process.env.USER_SERVICE_DB_URL || process.env.DATABASE_URL;
  
  if (!connectionUrl) {
    throw new DatabaseException(
      'Database connection URL not found in environment variables. ' +
      'Set USER_SERVICE_DB_URL or DATABASE_URL.'
    );
  }
  
  return connectionUrl;
};

// Create the database pool
const pool = new Pool({ connectionString: getConnectionUrl() });
const db = drizzle({ client: pool, schema });

// Check database connection
const checkConnection = async (): Promise<void> => {
  try {
    await pool.query('SELECT 1');
    console.log('[UserService] Database connection established successfully');
  } catch (error) {
    console.error('[UserService] Database connection failed:', error);
    throw new DatabaseException('Failed to connect to database', { originalError: error.message });
  }
};

// Graceful shutdown handler for database connections
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('[UserService] Database connection pool closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[UserService] Error closing database connection:', error);
    process.exit(1);
  }
});

// Export the database instance and connection utilities
export { db, pool, checkConnection };