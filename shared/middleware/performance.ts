/**
 * Performance Middleware
 * Fixed version for TypeScript compatibility in production builds
 * 
 * This middleware:
 * 1. Adds compression for HTTP responses
 * 2. Implements response time tracking
 * 3. Adds consistent cache control headers
 * 4. Provides browser cache directives based on content type
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { performance } from 'perf_hooks';

// Configure cache TTLs from environment or use defaults
const SHORT_TTL = Number(process.env.CACHE_SHORT_TTL) || 60; // 1 minute
const MEDIUM_TTL = Number(process.env.CACHE_MEDIUM_TTL) || 300; // 5 minutes
const LONG_TTL = Number(process.env.CACHE_LONG_TTL) || 3600; // 1 hour

// Cache control directives by content type
const CACHE_CONTROL_MAP: Record<string, string> = {
  // Static assets - long cache
  'image/': `public, max-age=${LONG_TTL}`,
  'font/': `public, max-age=${LONG_TTL}`,
  'text/css': `public, max-age=${LONG_TTL}`,
  'text/javascript': `public, max-age=${LONG_TTL}`,
  'application/javascript': `public, max-age=${LONG_TTL}`,
  
  // API responses - shorter cache
  'application/json': `private, max-age=${SHORT_TTL}`,
  
  // Documents - medium cache
  'application/pdf': `public, max-age=${MEDIUM_TTL}`,
  'application/msword': `public, max-age=${MEDIUM_TTL}`,
  'application/vnd.openxmlformats-officedocument': `public, max-age=${MEDIUM_TTL}`,
  
  // Default - no cache for dynamic content
  'default': 'no-store, must-revalidate'
};

/**
 * Track response time and add as header
 */
export function responseTimeMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = performance.now();
  
  // Capture original end method
  const originalEnd = res.end;
  
  // Override end method to add timing header
  // TypeScript-compatible signature to avoid errors in production builds
  res.end = function(this: Response, chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void): Response {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    // Add response time header
    this.setHeader('X-Response-Time', `${responseTime}ms`);
    
    // Handle overloaded function signature to maintain compatibility
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    
    // Call original end with proper arguments
    return originalEnd.call(this, chunk, encoding as BufferEncoding, callback);
  };
  
  next();
}

/**
 * Apply content-specific cache control headers
 */
export function cacheControlMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip for non-GET requests
  if (req.method !== 'GET') {
    return next();
  }
  
  // Original send method
  const originalSend = res.send;
  
  // Override send to add appropriate cache headers based on content type
  res.send = function(this: Response, body?: any): Response {
    const contentType = String(this.getHeader('Content-Type') || '');
    let cacheControl = CACHE_CONTROL_MAP['default'];
    
    // Find matching cache directive based on content type
    for (const [type, directive] of Object.entries(CACHE_CONTROL_MAP)) {
      if (contentType.includes(type)) {
        cacheControl = directive;
        break;
      }
    }
    
    // Set cache control header if not already set
    if (!this.getHeader('Cache-Control')) {
      this.setHeader('Cache-Control', cacheControl);
    }
    
    // Call original send
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Combined performance middleware
 */
export function setupPerformanceMiddleware(app: any) {
  // Add compression
  app.use(compression());
  
  // Add response time tracking
  app.use(responseTimeMiddleware);
  
  // Add cache control headers
  app.use(cacheControlMiddleware);
}

export default setupPerformanceMiddleware;