import { Request, Response, NextFunction } from 'express';
import { FreeZoneRepository } from '../repositories/freezoneRepository';
import { 
  insertFreeZoneSchema, 
  insertBusinessActivityCategorySchema,
  insertBusinessActivitySchema,
  type InsertFreeZone,
  type InsertBusinessActivityCategory,
  type InsertBusinessActivity
} from '../schema';
import { ServiceException, ErrorCode, ValidationException } from '../../../shared/errors';
import { asyncHandler } from '../../../shared/middleware/errorHandler';

// Initialize repository
const freezoneRepo = new FreeZoneRepository();

/**
 * Free Zone Controller
 * Handles free zone-related HTTP requests
 */
export class FreeZoneController {
  
  /**
   * Get free zone by ID
   */
  getFreeZone = asyncHandler(async (req: Request, res: Response) => {
    const freeZoneId = parseInt(req.params.id, 10);
    
    if (isNaN(freeZoneId)) {
      throw new ValidationException('Invalid free zone ID');
    }
    
    const freeZone = await freezoneRepo.getFreeZone(freeZoneId);
    
    if (!freeZone) {
      throw new ServiceException(
        ErrorCode.FREEZONE_NOT_FOUND,
        `Free zone with ID ${freeZoneId} not found`
      );
    }
    
    res.json({
      status: 'success',
      data: freeZone
    });
  });
  
  /**
   * Get free zone by slug
   */
  getFreeZoneBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    
    if (!slug) {
      throw new ValidationException('Slug parameter is required');
    }
    
    const freeZone = await freezoneRepo.getFreeZoneBySlug(slug);
    
    if (!freeZone) {
      throw new ServiceException(
        ErrorCode.FREEZONE_NOT_FOUND,
        `Free zone with slug '${slug}' not found`
      );
    }
    
    res.json({
      status: 'success',
      data: freeZone
    });
  });
  
  /**
   * Get all free zones with filtering and pagination
   */
  getAllFreeZones = asyncHandler(async (req: Request, res: Response) => {
    // Parse query parameters
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const sortBy = (req.query.sortBy as string) || 'id';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
    
    // Parse filter parameters
    const filters: { [key: string]: any } = {};
    
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    if (req.query.name) {
      filters.name = req.query.name;
    }
    
    if (req.query.location) {
      filters.location = req.query.location;
    }
    
    if (req.query.isPromoted !== undefined) {
      filters.isPromoted = req.query.isPromoted === 'true';
    }
    
    // Get results with filtering and pagination
    const freeZones = await freezoneRepo.getAllFreeZones(limit, offset, sortBy, sortOrder, filters);
    const totalCount = await freezoneRepo.countFreeZones(filters);
    
    res.json({
      status: 'success',
      data: freeZones,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: Math.ceil(totalCount / limit),
        currentPage: Math.floor(offset / limit) + 1
      }
    });
  });
  
  /**
   * Create a new free zone
   */
  createFreeZone = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = insertFreeZoneSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationException('Invalid free zone data', {
        validationErrors: validationResult.error.errors
      });
    }
    
    // Create free zone
    const freeZone = await freezoneRepo.createFreeZone(validationResult.data);
    
    res.status(201).json({
      status: 'success',
      data: freeZone
    });
  });
  
  /**
   * Update an existing free zone
   */
  updateFreeZone = asyncHandler(async (req: Request, res: Response) => {
    const freeZoneId = parseInt(req.params.id, 10);
    
    if (isNaN(freeZoneId)) {
      throw new ValidationException('Invalid free zone ID');
    }
    
    // Verify free zone exists
    const existingFreeZone = await freezoneRepo.getFreeZone(freeZoneId);
    
    if (!existingFreeZone) {
      throw new ServiceException(
        ErrorCode.FREEZONE_NOT_FOUND,
        `Free zone with ID ${freeZoneId} not found`
      );
    }
    
    // Validate update data
    const validationResult = insertFreeZoneSchema.partial().safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationException('Invalid free zone data', {
        validationErrors: validationResult.error.errors
      });
    }
    
    // Update free zone
    await freezoneRepo.updateFreeZone(freeZoneId, validationResult.data);
    
    // Fetch updated free zone
    const updatedFreeZone = await freezoneRepo.getFreeZone(freeZoneId);
    
    res.json({
      status: 'success',
      data: updatedFreeZone
    });
  });
  
  /**
   * Delete a free zone
   */
  deleteFreeZone = asyncHandler(async (req: Request, res: Response) => {
    const freeZoneId = parseInt(req.params.id, 10);
    
    if (isNaN(freeZoneId)) {
      throw new ValidationException('Invalid free zone ID');
    }
    
    // Verify free zone exists
    const existingFreeZone = await freezoneRepo.getFreeZone(freeZoneId);
    
    if (!existingFreeZone) {
      throw new ServiceException(
        ErrorCode.FREEZONE_NOT_FOUND,
        `Free zone with ID ${freeZoneId} not found`
      );
    }
    
    // Delete free zone
    await freezoneRepo.deleteFreeZone(freeZoneId);
    
    res.json({
      status: 'success',
      message: `Free zone with ID ${freeZoneId} has been deleted`
    });
  });
  
  /**
   * Get business activity category by ID
   */
  getBusinessActivityCategory = asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id, 10);
    
    if (isNaN(categoryId)) {
      throw new ValidationException('Invalid category ID');
    }
    
    const category = await freezoneRepo.getBusinessActivityCategory(categoryId);
    
    if (!category) {
      throw new ServiceException(
        ErrorCode.CATEGORY_NOT_FOUND,
        `Business activity category with ID ${categoryId} not found`
      );
    }
    
    res.json({
      status: 'success',
      data: category
    });
  });
  
  /**
   * Get business activity categories by parent ID
   * If parentId is 'root', returns root categories (with no parent)
   */
  getBusinessActivityCategoriesByParent = asyncHandler(async (req: Request, res: Response) => {
    let parentId: number | null = null;
    
    if (req.params.parentId !== 'root') {
      parentId = parseInt(req.params.parentId, 10);
      
      if (isNaN(parentId)) {
        throw new ValidationException('Invalid parent category ID');
      }
      
      // Verify parent category exists if not root
      const parentCategory = await freezoneRepo.getBusinessActivityCategory(parentId);
      
      if (!parentCategory) {
        throw new ServiceException(
          ErrorCode.CATEGORY_NOT_FOUND,
          `Parent category with ID ${parentId} not found`
        );
      }
    }
    
    const categories = await freezoneRepo.getBusinessActivityCategoriesByParent(parentId);
    
    res.json({
      status: 'success',
      data: categories
    });
  });
  
  /**
   * Get all business activity categories
   */
  getAllBusinessActivityCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await freezoneRepo.getAllBusinessActivityCategories();
    
    res.json({
      status: 'success',
      data: categories
    });
  });
  
  /**
   * Create a new business activity category
   */
  createBusinessActivityCategory = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = insertBusinessActivityCategorySchema.safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationException('Invalid business activity category data', {
        validationErrors: validationResult.error.errors
      });
    }
    
    // If parent ID is provided, verify it exists
    if (validationResult.data.parentId) {
      const parentCategory = await freezoneRepo.getBusinessActivityCategory(validationResult.data.parentId);
      
      if (!parentCategory) {
        throw new ServiceException(
          ErrorCode.CATEGORY_NOT_FOUND,
          `Parent category with ID ${validationResult.data.parentId} not found`
        );
      }
    }
    
    // Create category
    const category = await freezoneRepo.createBusinessActivityCategory(validationResult.data);
    
    res.status(201).json({
      status: 'success',
      data: category
    });
  });
  
  /**
   * Update a business activity category
   */
  updateBusinessActivityCategory = asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.id, 10);
    
    if (isNaN(categoryId)) {
      throw new ValidationException('Invalid category ID');
    }
    
    // Verify category exists
    const existingCategory = await freezoneRepo.getBusinessActivityCategory(categoryId);
    
    if (!existingCategory) {
      throw new ServiceException(
        ErrorCode.CATEGORY_NOT_FOUND,
        `Business activity category with ID ${categoryId} not found`
      );
    }
    
    // Validate update data
    const validationResult = insertBusinessActivityCategorySchema.partial().safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationException('Invalid business activity category data', {
        validationErrors: validationResult.error.errors
      });
    }
    
    // If updating parent ID, verify it exists and prevent circular references
    if (validationResult.data.parentId !== undefined) {
      if (validationResult.data.parentId !== null) {
        // Check if parent exists
        const parentCategory = await freezoneRepo.getBusinessActivityCategory(validationResult.data.parentId);
        
        if (!parentCategory) {
          throw new ServiceException(
            ErrorCode.CATEGORY_NOT_FOUND,
            `Parent category with ID ${validationResult.data.parentId} not found`
          );
        }
        
        // Prevent setting self as parent
        if (validationResult.data.parentId === categoryId) {
          throw new ValidationException('A category cannot be its own parent');
        }
      }
    }
    
    // Update category
    await freezoneRepo.updateBusinessActivityCategory(categoryId, validationResult.data);
    
    // Fetch updated category
    const updatedCategory = await freezoneRepo.getBusinessActivityCategory(categoryId);
    
    res.json({
      status: 'success',
      data: updatedCategory
    });
  });
  
  /**
   * Get business activity by ID
   */
  getBusinessActivity = asyncHandler(async (req: Request, res: Response) => {
    const activityId = parseInt(req.params.id, 10);
    
    if (isNaN(activityId)) {
      throw new ValidationException('Invalid business activity ID');
    }
    
    const activity = await freezoneRepo.getBusinessActivity(activityId);
    
    if (!activity) {
      throw new ServiceException(
        ErrorCode.ACTIVITY_NOT_FOUND,
        `Business activity with ID ${activityId} not found`
      );
    }
    
    res.json({
      status: 'success',
      data: activity
    });
  });
  
  /**
   * Get business activities by category
   */
  getBusinessActivitiesByCategory = asyncHandler(async (req: Request, res: Response) => {
    const categoryId = parseInt(req.params.categoryId, 10);
    
    if (isNaN(categoryId)) {
      throw new ValidationException('Invalid category ID');
    }
    
    // Verify category exists
    const category = await freezoneRepo.getBusinessActivityCategory(categoryId);
    
    if (!category) {
      throw new ServiceException(
        ErrorCode.CATEGORY_NOT_FOUND,
        `Business activity category with ID ${categoryId} not found`
      );
    }
    
    const activities = await freezoneRepo.getBusinessActivitiesByCategory(categoryId);
    
    res.json({
      status: 'success',
      data: activities
    });
  });
  
  /**
   * Search business activities
   */
  searchBusinessActivities = asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      throw new ValidationException('Search query parameter is required');
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    const activities = await freezoneRepo.searchBusinessActivities(query, limit, offset);
    
    res.json({
      status: 'success',
      data: activities
    });
  });
  
  // Additional controller methods for other endpoints would be added here
}