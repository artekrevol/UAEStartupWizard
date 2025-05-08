# Caching Strategy Documentation

This document outlines the caching architecture implemented in the UAE Business Setup platform to improve performance and reduce load on backend services.

## Overview

Our caching implementation uses a multi-level approach:

1. **Redis Caching**: Primary caching mechanism for server-side caching
2. **Memory Cache Fallback**: In-memory cache for when Redis is unavailable
3. **Browser Caching**: HTTP cache headers for frontend assets and API responses
4. **Route Caching**: Entire API response caching for read-heavy endpoints
5. **Query Caching**: Database query result caching to reduce database load

## Cache Layers

### Redis Cache

Redis provides our primary distributed caching layer:

- Shared cache accessible by all microservices
- Consistent caching for horizontal scaling
- Configurable TTL (Time To Live) for each cache entry
- Key-based invalidation patterns

### Memory Cache Fallback

An in-memory cache provides fault tolerance when Redis is unavailable:

- Automatic fallback when Redis connection fails
- Same API as Redis caching for transparent usage
- Process-local scope (not shared between service instances)

### Browser Cache

HTTP cache headers optimize browser-side caching:

- Long TTL for static assets (CSS, JS, images)
- Medium TTL for reference data (free zones, activities)
- Short TTL for frequently updated content
- Cache-Control directives customized by content type

### Response Compression

All API responses are compressed using gzip/deflate:

- Reduces bandwidth usage 
- Decreases page load times
- Conditional compression based on content type
- Configurable compression level (balance between CPU and size)

## Cache Key Strategy

We follow a structured approach to cache keys:

- Format: `resource-type:id:optional-qualifier`
- Examples:
  - `free-zone:123` - Free zone with ID 123
  - `document:456:metadata` - Metadata for document 456
  - `user:789:permissions` - Permissions for user 789
  - `free-zone:all` - List of all free zones

## Cache Invalidation Patterns

Several invalidation strategies are implemented:

1. **TTL-based expiration**: All cache entries expire after a defined TTL
2. **Manual invalidation**: Admin can clear specific cache prefixes via API
3. **Write-through invalidation**: Cache is automatically invalidated on data updates
4. **Prefix-based invalidation**: Clear all entries sharing a common prefix

## Performance Monitoring

Performance is monitored through:

- Response-time tracking with headers and logs
- Cache hit/miss ratio logging
- Slow query identification
- Memory usage tracking

## Administration

Administrators can manage the cache through the following endpoints:

- `GET /api/admin/cache/status` - View cache statistics
- `DELETE /api/admin/cache/clear/:prefix` - Clear cache by prefix
- `GET /api/admin/cache/entry/:key` - View specific cache entry (for debugging)

## Implementation Files

The caching system is implemented in the following files:

- `shared/cache/redis-client.ts` - Redis client implementation
- `shared/cache/memory-cache.ts` - Memory cache fallback
- `shared/cache/cache-manager.ts` - Unified cache interface
- `shared/middleware/cache-middleware.ts` - Express caching middleware
- `services/api-gateway/routes/cache.ts` - Cache admin endpoints
- `services/api-gateway/index.ts` - Compression and cache headers

## Best Practices

When implementing caching in services:

1. Define appropriate TTLs based on data volatility
2. Use the cache manager facade instead of direct Redis calls
3. Invalidate cache on write operations
4. Add cache headers for browser optimization
5. Monitor cache hit rates and adjust strategy if needed

## Configuration

Caching can be configured through environment variables:

- `CACHE_ENABLED`: Enable/disable caching (default: true)
- `REDIS_HOST`: Redis server hostname (default: 'localhost')
- `REDIS_PORT`: Redis server port (default: 6379)
- `REDIS_PASSWORD`: Redis server password (optional)
- `REDIS_DEFAULT_TTL`: Default TTL in seconds (default: 3600)
- `BROWSER_CACHE_MAX_AGE`: Browser cache TTL in seconds (default: 86400)
- `SERVER_CACHE_MAX_AGE`: Server cache TTL in seconds (default: 3600)