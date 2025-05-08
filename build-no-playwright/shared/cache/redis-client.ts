/**
 * Redis Client
 * 
 * This module provides a Redis client for caching data.
 * It handles connection, error handling, and provides utility methods
 * for interacting with Redis.
 */

import Redis from 'ioredis';
import { config } from '../config';

// Default TTL (1 hour)
const DEFAULT_TTL = config.redis?.defaultTtl || 3600;

// Create Redis client
let redisClient: Redis | null = null;
let redisReady = false;

try {
  redisClient = new Redis({
    host: config.redis?.host,
    port: config.redis?.port,
    password: config.redis?.password,
    retryStrategy: (times) => {
      // Exponential backoff with max 30 seconds
      const delay = Math.min(times * 1000, 30000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });
  
  redisClient.on('connect', () => {
    console.log('[Redis] Connected successfully');
    redisReady = true;
  });
  
  redisClient.on('error', (err) => {
    console.error('[Redis] Error connecting:', err);
    redisReady = false;
  });
  
  redisClient.on('ready', () => {
    console.log('[Redis] Ready to accept commands');
    redisReady = true;
  });
  
  redisClient.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
    redisReady = false;
  });
  
  redisClient.on('end', () => {
    console.log('[Redis] Connection closed');
    redisReady = false;
  });
} catch (error) {
  console.error('[Redis] Failed to initialize Redis client:', error);
  redisClient = null;
  redisReady = false;
}

/**
 * Check if Redis client is ready to accept commands
 * @returns Boolean indicating if Redis is connected and ready
 */
export function isRedisReady(): boolean {
  return redisReady && redisClient !== null;
}

/**
 * Get a value from Redis
 * @param key Redis key
 * @returns The cached value or null if not found
 */
export async function getCacheValue<T>(key: string): Promise<T | null> {
  if (!isRedisReady()) {
    return null;
  }
  
  try {
    const value = await redisClient!.get(key);
    
    if (!value) {
      return null;
    }
    
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[Redis] Error getting cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in Redis with optional expiration
 * @param key Redis key
 * @param value Value to cache
 * @param expirationSeconds Time to live in seconds
 */
export async function setCacheValue(key: string, value: any, expirationSeconds: number = DEFAULT_TTL): Promise<void> {
  if (!isRedisReady()) {
    return;
  }
  
  try {
    // Serialize value to JSON string
    const serializedValue = JSON.stringify(value);
    
    // Set with expiration
    await redisClient!.set(key, serializedValue, 'EX', expirationSeconds);
  } catch (error) {
    console.error(`[Redis] Error setting cache for key ${key}:`, error);
  }
}

/**
 * Delete a value from Redis
 * @param key Redis key
 */
export async function deleteCacheValue(key: string): Promise<void> {
  if (!isRedisReady()) {
    return;
  }
  
  try {
    await redisClient!.del(key);
  } catch (error) {
    console.error(`[Redis] Error deleting cache for key ${key}:`, error);
  }
}

/**
 * Clear all cache entries with a specific prefix
 * @param prefix Key prefix to match
 */
export async function clearCacheByPrefix(prefix: string): Promise<void> {
  if (!isRedisReady()) {
    return;
  }
  
  try {
    // Use SCAN to find keys with prefix
    const pattern = `${prefix}*`;
    let cursor = '0';
    let keys: string[] = [];
    
    do {
      // SCAN returns [nextCursor, keysFound]
      const reply = await redisClient!.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = reply[0];
      keys = keys.concat(reply[1]);
    } while (cursor !== '0');
    
    if (keys.length > 0) {
      // Delete found keys
      await redisClient!.del(...keys);
      console.log(`[Redis] Cleared ${keys.length} keys with prefix ${prefix}`);
    }
  } catch (error) {
    console.error(`[Redis] Error clearing cache with prefix ${prefix}:`, error);
  }
}

/**
 * Shutdown Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('[Redis] Connection closed gracefully');
    } catch (error) {
      console.error('[Redis] Error closing connection:', error);
    } finally {
      redisClient = null;
      redisReady = false;
    }
  }
}

// Clean shutdown handling
process.on('SIGTERM', async () => {
  await closeRedisConnection();
});

process.on('SIGINT', async () => {
  await closeRedisConnection();
});