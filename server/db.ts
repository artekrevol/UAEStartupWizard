import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSocket connections
neonConfig.webSocketConstructor = ws;

// Maximum number of connection retries
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Using a placeholder for now.");
  // In production, we should fail gracefully
  if (process.env.NODE_ENV === 'production') {
    console.error("Database connection will retry when DATABASE_URL is available.");
    // If SCRAPER_HTTP_ONLY_MODE is set, we can continue without a database initially
    if (process.env.SCRAPER_HTTP_ONLY_MODE !== 'true') {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }
  } else {
    throw new Error("DATABASE_URL must be set for development. Check your .env file.");
  }
}

// Create a connection pool with the database URL (if available)
const connectionOptions = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL }
  : undefined;

// Export a lazy-loaded pool and db that will only connect when actually used
let _pool: Pool | null = null;
let _db: any = null;

// Helper function to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getPool = async (retries = MAX_RETRIES): Promise<Pool | null> => {
  if (!_pool && connectionOptions) {
    try {
      _pool = new Pool(connectionOptions);
      
      // Test the connection
      const client = await _pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      console.log("Database connection pool initialized successfully");
    } catch (err) {
      console.error("Failed to initialize database pool:", err);
      
      // If we have retries left, attempt again after a delay
      if (retries > 0) {
        console.log(`Retrying database connection in ${RETRY_DELAY_MS}ms... (${retries} attempts left)`);
        await sleep(RETRY_DELAY_MS);
        return getPool(retries - 1);
      }
      
      // If in HTTP-only mode, we can proceed without a database
      if (process.env.SCRAPER_HTTP_ONLY_MODE === 'true') {
        console.warn("Continuing in HTTP-only mode without database connection");
        return null;
      }
      
      throw err;
    }
  }
  return _pool;
};

export const getDb = async () => {
  if (!_db) {
    const pool = await getPool();
    if (pool) {
      try {
        _db = drizzle({ client: pool, schema });
        console.log("Drizzle ORM initialized successfully");
      } catch (err) {
        console.error("Failed to initialize Drizzle ORM:", err);
        
        // If in HTTP-only mode, we can proceed without a database
        if (process.env.SCRAPER_HTTP_ONLY_MODE === 'true') {
          console.warn("Continuing in HTTP-only mode without Drizzle ORM");
          return null;
        }
        
        throw err;
      }
    }
  }
  return _db;
};

// For backward compatibility with existing code
// We don't await these here to avoid making the import async, but they will connect properly on first use
export const pool = (() => {
  // Queue up the pool initialization but don't wait for it
  const poolPromise = getPool();
  // Return a proxy that will await the pool when used
  return new Proxy({} as Pool, {
    get: (target, prop) => {
      // Return a function that awaits the pool and then calls the requested method
      return async (...args: any[]) => {
        const resolvedPool = await poolPromise;
        if (!resolvedPool) {
          throw new Error('Database pool not available');
        }
        return (resolvedPool as any)[prop](...args);
      };
    }
  });
})();

export const db = (() => {
  // Queue up the db initialization but don't wait for it
  const dbPromise = getDb();
  // Return a proxy that will await the db when used
  return new Proxy({} as any, {
    get: (target, prop) => {
      // Return a function that awaits the db and then calls the requested method
      return async (...args: any[]) => {
        const resolvedDb = await dbPromise;
        if (!resolvedDb) {
          throw new Error('Database not available');
        }
        return resolvedDb[prop](...args);
      };
    }
  });
})();
