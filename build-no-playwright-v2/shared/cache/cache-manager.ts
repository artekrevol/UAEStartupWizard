/**
 * Cache Manager
 * 
 * This module provides a unified caching interface that automatically falls back
 * to memory cache when Redis is not available. It also provides utilities for
 * generating cache keys and managing cache invalidation.
 */

import { config } from '../config';
import { 
  getCacheValue as getRedisValue,
  setCacheValue as setRedisValue,
  deleteCacheValue as deleteRedisValue,
  clearCacheByPrefix as clearRedisByPrefix,
  isRedisReady
} from './redis-client';

import {
  getMemoryCacheValue,
  setMemoryCacheValue,
  deleteMemoryCacheValue,
  clearMemoryCacheByPrefix
} from './memory-cache';

// Get default TTL from config
const DEFAULT_TTL = config.redis?.defaultTtl || 3600; // 1 hour in seconds

/**
 * Get a value from cache (Redis or memory fallback)
 * @param key Cache key
 * @returns The cached value or null if not found
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    // Check if caching is enabled
    if (!config.cache?.enabled) {
      return null;
    }
    
    // Try Redis first if it's available
    if (isRedisReady()) {
      const redisValue = await getRedisValue<T>(key);
      if (redisValue !== null) {
        return redisValue;
      }
    }
    
    // Fall back to memory cache
    return getMemoryCacheValue<T>(key);
  } catch (error) {
    console.error(`[CacheManager] Error getting cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in cache (Redis and memory)
 * @param key Cache key
 * @param value Value to cache
 * @param expirationSeconds Time to live in seconds
 */
export async function setCache(key: string, value: any, expirationSeconds: number = DEFAULT_TTL): Promise<void> {
  try {
    // Skip if caching is disabled
    if (!config.cache?.enabled) {
      return;
    }
    
    // Try to set in Redis
    if (isRedisReady()) {
      await setRedisValue(key, value, expirationSeconds);
    }
    
    // Always set in memory cache as backup
    setMemoryCacheValue(key, value, expirationSeconds);
  } catch (error) {
    console.error(`[CacheManager] Error setting cache for key ${key}:`, error);
  }
}

/**
 * Delete a value from cache (Redis and memory)
 * @param key Cache key
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    // Skip if caching is disabled
    if (!config.cache?.enabled) {
      return;
    }
    
    // Try to delete from Redis
    if (isRedisReady()) {
      await deleteRedisValue(key);
    }
    
    // Always delete from memory cache
    deleteMemoryCacheValue(key);
  } catch (error) {
    console.error(`[CacheManager] Error deleting cache for key ${key}:`, error);
  }
}

/**
 * Clear all cache entries with a specific prefix
 * @param prefix Key prefix to match
 */
export async function clearCacheByPrefix(prefix: string): Promise<void> {
  try {
    // Skip if caching is disabled
    if (!config.cache?.enabled) {
      return;
    }
    
    // Try to clear from Redis
    if (isRedisReady()) {
      await clearRedisByPrefix(prefix);
    }
    
    // Always clear from memory cache
    clearMemoryCacheByPrefix(prefix);
  } catch (error) {
    console.error(`[CacheManager] Error clearing cache with prefix ${prefix}:`, error);
  }
}

/**
 * Generate a cache key for a given resource and ID
 * @param resource The resource type (e.g., 'user', 'document')
 * @param id The resource ID
 * @returns A formatted cache key
 */
export function generateCacheKey(resource: string, id: string | number): string {
  return `${resource}:${id}`;
}

/**
 * Generate a cache key for a collection of resources with optional filters
 * @param resource The resource type (e.g., 'users', 'documents')
 * @param filters Optional filters as key-value pairs
 * @returns A formatted cache key
 */
export function generateCollectionCacheKey(resource: string, filters?: Record<string, any>): string {
  if (!filters || Object.keys(filters).length === 0) {
    return `${resource}:all`;
  }
  
  // Sort the filter keys to ensure consistent cache keys regardless of object property order
  const sortedFilters = Object.keys(filters).sort().reduce((result, key) => {
    result[key] = filters[key];
    return result;
  }, {} as Record<string, any>);
  
  // Convert filters to string with consistent format
  const filterString = Object.entries(sortedFilters)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return `${resource}:filter:${filterString}`;
}