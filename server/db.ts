import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for WebSocket connections
neonConfig.webSocketConstructor = ws;

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

export const getPool = () => {
  if (!_pool && connectionOptions) {
    try {
      _pool = new Pool(connectionOptions);
      console.log("Database connection pool initialized successfully");
    } catch (err) {
      console.error("Failed to initialize database pool:", err);
      throw err;
    }
  }
  return _pool;
};

export const getDb = () => {
  if (!_db && getPool()) {
    try {
      _db = drizzle({ client: getPool() as Pool, schema });
      console.log("Drizzle ORM initialized successfully");
    } catch (err) {
      console.error("Failed to initialize Drizzle ORM:", err);
      throw err;
    }
  }
  return _db;
};

// For backward compatibility with existing code
export const pool = getPool();
export const db = getDb();
