/**
 * Redis Client Singleton
 * 
 * This module provides a Redis client instance that can be reused across the application.
 * It handles connection management and provides a simple interface for caching operations.
 */

import Redis from 'ioredis';
import { config } from '../config';

// Create Redis client instance
const redisClient = new Redis({
  host: config.redis?.host || 'localhost',
  port: config.redis?.port || 6379,
  password: config.redis?.password,
  retryStrategy: (times) => {
    // Retry with exponential backoff
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Log redis connection events
redisClient.on('connect', () => {
  console.log('[Redis] Connected to Redis server');
});

redisClient.on('error', (err) => {
  console.error('[Redis] Error connecting to Redis:', err);
});

redisClient.on('reconnecting', () => {
  console.log('[Redis] Reconnecting to Redis server');
});

/**
 * Set a value in Redis cache with optional expiration
 * @param key Cache key
 * @param value Value to cache (will be JSON stringified)
 * @param expirationSeconds Time to live in seconds
 */
export async function setCacheValue(key: string, value: any, expirationSeconds?: number): Promise<void> {
  try {
    const stringValue = JSON.stringify(value);
    
    if (expirationSeconds) {
      await redisClient.setex(key, expirationSeconds, stringValue);
    } else {
      await redisClient.set(key, stringValue);
    }
  } catch (error) {
    console.error(`[Redis] Error setting cache for key ${key}:`, error);
    // Fail gracefully, don't break the application if cache fails
  }
}

/**
 * Get a value from Redis cache
 * @param key Cache key
 * @returns The parsed cached value or null if not found
 */
export async function getCacheValue<T>(key: string): Promise<T | null> {
  try {
    const value = await redisClient.get(key);
    
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
 * Delete a value from Redis cache
 * @param key Cache key
 */
export async function deleteCacheValue(key: string): Promise<void> {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error(`[Redis] Error deleting cache for key ${key}:`, error);
  }
}

/**
 * Clear all cache entries with a specific prefix
 * @param prefix Key prefix to match
 */
export async function clearCacheByPrefix(prefix: string): Promise<void> {
  try {
    const keys = await redisClient.keys(`${prefix}*`);
    
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`[Redis] Cleared ${keys.length} keys with prefix ${prefix}`);
    }
  } catch (error) {
    console.error(`[Redis] Error clearing cache with prefix ${prefix}:`, error);
  }
}

/**
 * Check if Redis is connected and ready
 * @returns Boolean indicating if Redis is ready
 */
export function isRedisReady(): boolean {
  return redisClient.status === 'ready';
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  try {
    await redisClient.quit();
    console.log('[Redis] Connection closed gracefully');
  } catch (error) {
    console.error('[Redis] Error closing Redis connection:', error);
  }
}

export default redisClient;