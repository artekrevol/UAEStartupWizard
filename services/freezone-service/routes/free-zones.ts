/**
 * Free Zones Routes with Caching
 *
 * This module provides routes to manage free zones with Redis/memory caching
 */

import express from 'express';
import { storage } from '../storage';
import { getCache, setCache, deleteCache, clearCacheByPrefix } from '../../../shared/cache/cache-manager';
import { cacheRoute, setCacheHeaders } from '../../../shared/middleware/cache-middleware';
import { authenticateJWT, authorizeRoles } from '../../../shared/middleware/auth';
import { validateRequest } from '../../../shared/middleware/validation';
import { insertFreeZoneSchema } from '../../../shared/schema';

const router = express.Router();
const FREE_ZONE_CACHE_PREFIX = 'free-zone';
const FREE_ZONE_LIST_CACHE_KEY = `${FREE_ZONE_CACHE_PREFIX}:all`;
const CACHE_TTL = 3600; // 1 hour in seconds

/**
 * Get all free zones with caching
 * 
 * GET /api/free-zones
 */
router.get('/', setCacheHeaders(CACHE_TTL), cacheRoute(CACHE_TTL), async (req, res) => {
  try {
    // Try to get from cache first
    const cachedFreeZones = await getCache<any[]>(FREE_ZONE_LIST_CACHE_KEY);
    
    if (cachedFreeZones) {
      console.log('[FreeZone] Cache hit for free zones list');
      return res.json(cachedFreeZones);
    }
    
    console.log('[FreeZone] Cache miss for free zones list');
    const freeZones = await storage.getAllFreeZones();
    
    // Cache the result
    await setCache(FREE_ZONE_LIST_CACHE_KEY, freeZones, CACHE_TTL);
    
    res.json(freeZones);
  } catch (error: any) {
    console.error('[FreeZone] Error getting free zones:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get a single free zone by ID with caching
 * 
 * GET /api/free-zones/:id
 */
router.get('/:id', setCacheHeaders(CACHE_TTL), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Generate cache key for this specific free zone
    const cacheKey = `${FREE_ZONE_CACHE_PREFIX}:${id}`;
    
    // Try to get from cache first
    const cachedFreeZone = await getCache(cacheKey);
    
    if (cachedFreeZone) {
      console.log(`[FreeZone] Cache hit for free zone ID ${id}`);
      return res.json(cachedFreeZone);
    }
    
    console.log(`[FreeZone] Cache miss for free zone ID ${id}`);
    const freeZone = await storage.getFreeZoneById(id);
    
    if (!freeZone) {
      return res.status(404).json({ message: 'Free zone not found' });
    }
    
    // Cache the result
    await setCache(cacheKey, freeZone, CACHE_TTL);
    
    res.json(freeZone);
  } catch (error: any) {
    console.error(`[FreeZone] Error getting free zone:`, error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Create a new free zone (admin only)
 * Invalidates cache after creation
 * 
 * POST /api/free-zones
 */
router.post('/', 
  authenticateJWT, 
  authorizeRoles(['admin']),
  validateRequest(insertFreeZoneSchema),
  async (req, res) => {
    try {
      const newFreeZone = await storage.createFreeZone(req.body);
      
      // Invalidate the free zones list cache
      await clearCacheByPrefix(FREE_ZONE_CACHE_PREFIX);
      
      res.status(201).json(newFreeZone);
    } catch (error: any) {
      console.error('[FreeZone] Error creating free zone:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * Update a free zone (admin only)
 * Invalidates cache after update
 * 
 * PUT /api/free-zones/:id
 */
router.put('/:id',
  authenticateJWT,
  authorizeRoles(['admin']),
  validateRequest(insertFreeZoneSchema),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedFreeZone = await storage.updateFreeZone(id, req.body);
      
      if (!updatedFreeZone) {
        return res.status(404).json({ message: 'Free zone not found' });
      }
      
      // Invalidate caches
      await deleteCache(`${FREE_ZONE_CACHE_PREFIX}:${id}`);
      await deleteCache(FREE_ZONE_LIST_CACHE_KEY);
      
      res.json(updatedFreeZone);
    } catch (error: any) {
      console.error('[FreeZone] Error updating free zone:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * Delete a free zone (admin only)
 * Invalidates cache after deletion
 * 
 * DELETE /api/free-zones/:id
 */
router.delete('/:id',
  authenticateJWT,
  authorizeRoles(['admin']),
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteFreeZone(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Free zone not found' });
      }
      
      // Invalidate caches
      await deleteCache(`${FREE_ZONE_CACHE_PREFIX}:${id}`);
      await deleteCache(FREE_ZONE_LIST_CACHE_KEY);
      
      res.status(204).send();
    } catch (error: any) {
      console.error('[FreeZone] Error deleting free zone:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * Get activities for a specific free zone with caching
 * 
 * GET /api/free-zones/:id/activities
 */
router.get('/:id/activities', setCacheHeaders(CACHE_TTL), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Generate cache key for this specific free zone's activities
    const cacheKey = `${FREE_ZONE_CACHE_PREFIX}:${id}:activities`;
    
    // Try to get from cache first
    const cachedActivities = await getCache(cacheKey);
    
    if (cachedActivities) {
      console.log(`[FreeZone] Cache hit for free zone ID ${id} activities`);
      return res.json(cachedActivities);
    }
    
    console.log(`[FreeZone] Cache miss for free zone ID ${id} activities`);
    const activities = await storage.getFreeZoneActivities(id);
    
    if (!activities) {
      return res.status(404).json({ message: 'Free zone activities not found' });
    }
    
    // Cache the result
    await setCache(cacheKey, activities, CACHE_TTL);
    
    res.json(activities);
  } catch (error: any) {
    console.error(`[FreeZone] Error getting free zone activities:`, error);
    res.status(500).json({ message: error.message });
  }
});

export { router };