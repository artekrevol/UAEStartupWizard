/**
 * Cache Middleware for Express
 * 
 * This middleware provides HTTP caching capabilities for Express routes:
 * 1. Route Caching - Caches entire response bodies for GET requests
 * 2. HTTP Cache Control - Sets appropriate cache headers for browser caching
 */

import { Request, Response, NextFunction } from 'express';
import { getCache, setCache, generateCollectionCacheKey } from '../cache/cache-manager';
import { config } from '../config';

// Default TTL from config
const DEFAULT_SERVER_TTL = config.cache?.serverMaxAge || 3600; // 1 hour in seconds
const DEFAULT_BROWSER_TTL = config.cache?.browserMaxAge || 86400; // 24 hours in seconds

/**
 * Middleware to cache entire responses for GET requests
 * @param ttlSeconds Time to live in seconds
 * @returns Express middleware function
 */
export function cacheRoute(ttlSeconds: number = DEFAULT_SERVER_TTL) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if feature is disabled or for non-GET requests
    if (!config.cache?.enabled || req.method !== 'GET') {
      return next();
    }
    
    // Skip caching for authenticated requests unless explicitly enabled
    if (req.isAuthenticated && req.isAuthenticated()) {
      // You could customize this to still cache for authenticated users if needed
      return next();
    }
    
    try {
      // Generate a cache key from the request URL and query params
      const queryString = Object.keys(req.query).length 
        ? JSON.stringify(req.query) 
        : '';
      
      const cacheKey = `route:${req.originalUrl}:${queryString}`;
      
      // Try to get from cache
      const cachedResponse = await getCache<{
        body: any;
        statusCode: number;
        headers: Record<string, string>;
      }>(cacheKey);
      
      if (cachedResponse) {
        // Restore the cached response
        if (cachedResponse.headers) {
          Object.entries(cachedResponse.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }
        
        // Add cache hit header for debugging
        res.setHeader('X-Cache', 'HIT');
        
        return res.status(cachedResponse.statusCode).send(cachedResponse.body);
      }
      
      // If not in cache, capture the response
      const originalSend = res.send;
      
      res.send = function(body): Response {
        // Add cache miss header for debugging
        res.setHeader('X-Cache', 'MISS');
        
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache the response
          const responseToCache = {
            body,
            statusCode: res.statusCode,
            headers: {
              'Content-Type': res.getHeader('Content-Type') as string,
            },
          };
          
          setCache(cacheKey, responseToCache, ttlSeconds);
        }
        
        // Send the original response
        return originalSend.call(this, body);
      };
      
      next();
    } catch (error) {
      console.error('[CacheMiddleware] Error in route caching:', error);
      next();
    }
  };
}

/**
 * Sets Cache-Control and other cache-related HTTP headers
 * @param ttlSeconds Time to live in seconds for browser caching
 * @param options Additional caching options
 * @returns Express middleware function
 */
export function setCacheHeaders(
  ttlSeconds: number = DEFAULT_BROWSER_TTL,
  options: {
    private?: boolean;       // If true, marks response as private
    noStore?: boolean;       // If true, disables caching entirely
    mustRevalidate?: boolean; // If true, forces revalidation
    etag?: boolean;          // If true, enables ETag (default: true)
    weak?: boolean;          // If true, uses weak ETags (default: true)
  } = {}
) {
  const { 
    private: isPrivate = false,
    noStore = false,
    mustRevalidate = false,
    etag = true,
    weak = true
  } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    
    if (noStore) {
      // Disable caching entirely
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('Pragma', 'no-cache');
    } else {
      // Set cache control directive
      const directives = [
        isPrivate ? 'private' : 'public',
        `max-age=${ttlSeconds}`,
      ];
      
      if (mustRevalidate) {
        directives.push('must-revalidate');
      }
      
      res.setHeader('Cache-Control', directives.join(', '));
      
      // Set expiration headers
      const expiresDate = new Date(Date.now() + ttlSeconds * 1000);
      res.setHeader('Expires', expiresDate.toUTCString());
    }
    
    if (etag) {
      // Enable ETag support
      // Note: Express has built-in ETag support that can be configured
      // This is handled automatically if you use res.json() or res.send()
      // The 'weak' parameter is configured via app.set('etag', 'weak') in your main app
    }
    
    next();
  };
}

/**
 * Middleware to dynamically cache results from database queries
 * Use this to wrap around your database calls within route handlers
 * @param resourceType Type of resource being queried (e.g., 'users', 'documents')
 * @param ttlSeconds Time to live in seconds
 * @returns A function that wraps database calls with caching
 */
export function cacheQuery<T>(resourceType: string, ttlSeconds: number = DEFAULT_SERVER_TTL) {
  return async (
    queryFn: () => Promise<T>, 
    filters?: Record<string, any>
  ): Promise<T> => {
    // Skip caching if disabled
    if (!config.cache?.enabled) {
      return queryFn();
    }
    
    try {
      // Generate cache key based on resource type and filters
      const cacheKey = generateCollectionCacheKey(resourceType, filters);
      
      // Try to get from cache
      const cachedResult = await getCache<T>(cacheKey);
      
      if (cachedResult !== null) {
        console.log(`[CacheMiddleware] Cache hit for ${cacheKey}`);
        return cachedResult;
      }
      
      // If not in cache, execute the query
      console.log(`[CacheMiddleware] Cache miss for ${cacheKey}`);
      const result = await queryFn();
      
      // Cache the result
      await setCache(cacheKey, result, ttlSeconds);
      
      return result;
    } catch (error) {
      console.error(`[CacheMiddleware] Error caching query for ${resourceType}:`, error);
      // Fall back to executing the query directly
      return queryFn();
    }
  };
}