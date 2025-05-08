/**
 * Cache Management Endpoints for API Gateway
 * 
 * These endpoints provide administrative controls to view cache statistics
 * and manage cache entries.
 */

import express from 'express';
import { authenticateJWT, authorizeRoles } from '../../../shared/middleware/auth';
import { isRedisReady } from '../../../shared/cache/redis-client';
import { 
  getAllMemoryCacheKeys, 
  getMemoryCacheSize 
} from '../../../shared/cache/memory-cache';
import { 
  clearCacheByPrefix, 
  getCache
} from '../../../shared/cache/cache-manager';

const router = express.Router();

/**
 * Get cache status information
 * Restricted to admins
 * 
 * GET /api/admin/cache/status
 */
router.get('/status', 
  authenticateJWT, 
  authorizeRoles(['admin']), 
  async (req, res) => {
    try {
      // Get Redis status
      const redisStatus = isRedisReady() ? 'connected' : 'disconnected';
      
      // Get memory cache stats
      const memoryCacheSize = getMemoryCacheSize();
      const memoryCacheKeys = getAllMemoryCacheKeys();
      
      // Count keys by prefix
      const prefixCounts: Record<string, number> = {};
      
      memoryCacheKeys.forEach(key => {
        // Extract prefix (everything before the first colon)
        const prefix = key.split(':')[0];
        prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
      });
      
      res.json({
        status: 'ok',
        cache: {
          redis: {
            status: redisStatus,
          },
          memory: {
            status: 'active',
            size: memoryCacheSize,
            keysByPrefix: prefixCounts
          }
        }
      });
    } catch (error: any) {
      console.error('[Cache] Error getting cache status:', error);
      res.status(500).json({ message: error.message });
    }
});

/**
 * Clear cache for a specific prefix
 * Restricted to admins
 * 
 * DELETE /api/admin/cache/clear/:prefix
 */
router.delete('/clear/:prefix',
  authenticateJWT,
  authorizeRoles(['admin']),
  async (req, res) => {
    try {
      const { prefix } = req.params;
      
      if (!prefix) {
        return res.status(400).json({ message: 'Cache prefix is required' });
      }
      
      await clearCacheByPrefix(prefix);
      
      res.json({ 
        status: 'ok', 
        message: `Cache entries with prefix '${prefix}' cleared` 
      });
    } catch (error: any) {
      console.error('[Cache] Error clearing cache:', error);
      res.status(500).json({ message: error.message });
    }
});

/**
 * Get a specific cache entry by key (for debugging)
 * Restricted to admins
 * 
 * GET /api/admin/cache/entry/:key
 */
router.get('/entry/:key',
  authenticateJWT,
  authorizeRoles(['admin']),
  async (req, res) => {
    try {
      const { key } = req.params;
      
      if (!key) {
        return res.status(400).json({ message: 'Cache key is required' });
      }
      
      const value = await getCache(key);
      
      if (value === null) {
        return res.status(404).json({ message: 'Cache entry not found' });
      }
      
      res.json({
        key,
        value
      });
    } catch (error: any) {
      console.error('[Cache] Error getting cache entry:', error);
      res.status(500).json({ message: error.message });
    }
});

export { router };