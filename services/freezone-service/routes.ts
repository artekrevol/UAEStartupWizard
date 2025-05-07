import express from 'express';
import { FreeZoneController } from './controllers/freezoneController';
import { authenticateJWT, requireAdmin } from '../../services/api-gateway/middleware/auth';

// Initialize controller
const freezoneController = new FreeZoneController();

// Create router
const router = express.Router();

/**
 * Free Zone Routes
 */

// Get all free zones (with pagination and filtering)
router.get('/freezones', freezoneController.getAllFreeZones);

// Get free zone by ID
router.get('/freezones/:id', freezoneController.getFreeZone);

// Get free zone by slug
router.get('/freezones/slug/:slug', freezoneController.getFreeZoneBySlug);

// Create a new free zone (admin only)
router.post(
  '/freezones',
  authenticateJWT,
  requireAdmin,
  freezoneController.createFreeZone
);

// Update a free zone (admin only)
router.put(
  '/freezones/:id',
  authenticateJWT,
  requireAdmin,
  freezoneController.updateFreeZone
);

// Delete a free zone (admin only)
router.delete(
  '/freezones/:id',
  authenticateJWT,
  requireAdmin,
  freezoneController.deleteFreeZone
);

/**
 * Business Activity Category Routes
 */

// Get all business activity categories
router.get('/business-categories', freezoneController.getAllBusinessActivityCategories);

// Get business activity category by ID
router.get('/business-categories/:id', freezoneController.getBusinessActivityCategory);

// Get business activity categories by parent
router.get('/business-categories/parent/:parentId', freezoneController.getBusinessActivityCategoriesByParent);

// Create a new business activity category (admin only)
router.post(
  '/business-categories',
  authenticateJWT,
  requireAdmin,
  freezoneController.createBusinessActivityCategory
);

// Update a business activity category (admin only)
router.put(
  '/business-categories/:id',
  authenticateJWT,
  requireAdmin,
  freezoneController.updateBusinessActivityCategory
);

/**
 * Business Activity Routes
 */

// Get business activity by ID
router.get('/business-activities/:id', freezoneController.getBusinessActivity);

// Get business activities by category
router.get('/business-activities/category/:categoryId', freezoneController.getBusinessActivitiesByCategory);

// Search business activities
router.get('/business-activities/search', freezoneController.searchBusinessActivities);

// Additional routes for other entities would be defined here

export default router;