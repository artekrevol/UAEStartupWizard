/**
 * Memory Cache Module
 * 
 * This module provides a simple in-memory cache that can be used as a fallback
 * when Redis is not available. It uses the memory-cache package to store
 * data with expiration times.
 */

import cache from 'memory-cache';
import { config } from '../config';

// Add type declaration for memory-cache to fix TypeScript errors
declare module 'memory-cache' {
  export function put(key: string, value: any, time?: number, timeoutCallback?: Function): any;
  export function get(key: string): any;
  export function del(key: string): any;
  export function clear(): void;
  export function size(): number;
  export function memsize(): number;
  export function debug(bool: boolean): void;
  export function keys(): any[];
  export function exportJson(): string;
  export function importJson(json: string, options?: { maxAge?: number }): void;
}

// Default TTL from config
const DEFAULT_TTL = config.redis?.defaultTtl || 3600; // 1 hour

/**
 * Set a value in memory cache with optional expiration
 * @param key Cache key
 * @param value Value to cache
 * @param expirationSeconds Time to live in seconds
 */
export function setMemoryCacheValue(key: string, value: any, expirationSeconds: number = DEFAULT_TTL): void {
  try {
    // Convert seconds to milliseconds for memory-cache
    const ttlMs = expirationSeconds * 1000;
    
    // Store the value
    cache.put(key, value, ttlMs);
  } catch (error) {
    console.error(`[MemoryCache] Error setting cache for key ${key}:`, error);
  }
}

/**
 * Get a value from memory cache
 * @param key Cache key
 * @returns The cached value or null if not found
 */
export function getMemoryCacheValue<T>(key: string): T | null {
  try {
    const value = cache.get(key);
    return value as T || null;
  } catch (error) {
    console.error(`[MemoryCache] Error getting cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Delete a value from memory cache
 * @param key Cache key
 */
export function deleteMemoryCacheValue(key: string): void {
  try {
    cache.del(key);
  } catch (error) {
    console.error(`[MemoryCache] Error deleting cache for key ${key}:`, error);
  }
}

/**
 * Clear all cache entries with a specific prefix
 * @param prefix Key prefix to match
 */
export function clearMemoryCacheByPrefix(prefix: string): void {
  try {
    const keys = cache.keys()
      .filter(key => typeof key === 'string' && key.startsWith(prefix));
    
    keys.forEach(key => cache.del(key));
    
    console.log(`[MemoryCache] Cleared ${keys.length} keys with prefix ${prefix}`);
  } catch (error) {
    console.error(`[MemoryCache] Error clearing cache with prefix ${prefix}:`, error);
  }
}

/**
 * Clear all cache entries
 */
export function clearAllMemoryCache(): void {
  try {
    cache.clear();
    console.log('[MemoryCache] Cleared all cache entries');
  } catch (error) {
    console.error('[MemoryCache] Error clearing all cache entries:', error);
  }
}

/**
 * Get all cached keys
 * @returns Array of cached keys
 */
export function getAllMemoryCacheKeys(): string[] {
  return cache.keys().filter(key => typeof key === 'string') as string[];
}

/**
 * Get the size of the memory cache in entries
 * @returns Number of cached entries
 */
export function getMemoryCacheSize(): number {
  return cache.size();
}