import { eq, and, desc, asc, sql, like, ilike } from 'drizzle-orm';
import { db } from '../db';
import { 
  freeZones, 
  businessActivityCategories, 
  businessActivities, 
  licenseTypes,
  legalForms,
  establishmentGuides,
  freeZoneComparisons,
  freeZoneIncentives,
  freeZoneReviews,
  type FreeZone,
  type InsertFreeZone,
  type BusinessActivityCategory,
  type InsertBusinessActivityCategory,
  type BusinessActivity,
  type InsertBusinessActivity,
  type LicenseType,
  type InsertLicenseType,
  type LegalForm,
  type InsertLegalForm,
  type EstablishmentGuide,
  type InsertEstablishmentGuide,
  type FreeZoneComparison,
  type InsertFreeZoneComparison,
  type FreeZoneIncentive,
  type InsertFreeZoneIncentive,
  type FreeZoneReview,
  type InsertFreeZoneReview
} from '../schema';
import { NotFoundException, DatabaseException } from '../../../shared/errors';

/**
 * Free Zone Repository
 * Handles database operations for free zones and related entities
 */
export class FreeZoneRepository {
  /**
   * Free Zone Methods
   */
  
  // Get a free zone by ID
  async getFreeZone(id: number): Promise<FreeZone | undefined> {
    try {
      const [freeZone] = await db.select().from(freeZones).where(eq(freeZones.id, id));
      return freeZone;
    } catch (error) {
      throw new DatabaseException('Failed to fetch free zone', { originalError: error.message });
    }
  }

  // Get a free zone by slug
  async getFreeZoneBySlug(slug: string): Promise<FreeZone | undefined> {
    try {
      const [freeZone] = await db.select().from(freeZones).where(eq(freeZones.slug, slug));
      return freeZone;
    } catch (error) {
      throw new DatabaseException('Failed to fetch free zone by slug', { originalError: error.message });
    }
  }

  // Get all free zones
  async getAllFreeZones(
    limit: number = 50, 
    offset: number = 0, 
    sortBy: keyof FreeZone = 'id',
    sortOrder: 'asc' | 'desc' = 'asc',
    filters: { [key: string]: any } = {}
  ): Promise<FreeZone[]> {
    try {
      // Start with base query
      let query = db.select().from(freeZones);
      
      // Apply filters
      if (filters) {
        // Filter by status
        if (filters.status) {
          query = query.where(eq(freeZones.status, filters.status));
        }
        
        // Filter by name (partial match)
        if (filters.name) {
          query = query.where(ilike(freeZones.name, `%${filters.name}%`));
        }
        
        // Filter by location (partial match)
        if (filters.location) {
          query = query.where(ilike(freeZones.location, `%${filters.location}%`));
        }
        
        // Filter by promoted status
        if (filters.isPromoted !== undefined) {
          query = query.where(eq(freeZones.isPromoted, filters.isPromoted));
        }
      }
      
      // Apply pagination
      query = query.limit(limit).offset(offset);
        
      // Apply sorting
      if (sortOrder === 'asc') {
        query = query.orderBy(asc(freeZones[sortBy as keyof typeof freeZones]));
      } else {
        query = query.orderBy(desc(freeZones[sortBy as keyof typeof freeZones]));
      }
      
      return await query;
    } catch (error) {
      throw new DatabaseException('Failed to fetch all free zones', { originalError: error.message });
    }
  }

  // Count all free zones (for pagination)
  async countFreeZones(filters: { [key: string]: any } = {}): Promise<number> {
    try {
      // Start with base query
      let query = db.select({ count: sql`count(*)` }).from(freeZones);
      
      // Apply filters
      if (filters) {
        if (filters.status) {
          query = query.where(eq(freeZones.status, filters.status));
        }
        
        if (filters.name) {
          query = query.where(ilike(freeZones.name, `%${filters.name}%`));
        }
        
        if (filters.location) {
          query = query.where(ilike(freeZones.location, `%${filters.location}%`));
        }
        
        if (filters.isPromoted !== undefined) {
          query = query.where(eq(freeZones.isPromoted, filters.isPromoted));
        }
      }
      
      const result = await query;
      return parseInt(result[0].count.toString(), 10);
    } catch (error) {
      throw new DatabaseException('Failed to count free zones', { originalError: error.message });
    }
  }

  // Create a free zone
  async createFreeZone(freeZone: InsertFreeZone): Promise<FreeZone> {
    try {
      const [createdFreeZone] = await db
        .insert(freeZones)
        .values(freeZone)
        .returning();
      return createdFreeZone;
    } catch (error) {
      throw new DatabaseException('Failed to create free zone', { originalError: error.message });
    }
  }

  // Update a free zone
  async updateFreeZone(id: number, freeZone: Partial<FreeZone>): Promise<void> {
    try {
      const result = await db
        .update(freeZones)
        .set({
          ...freeZone,
          lastUpdated: new Date()
        })
        .where(eq(freeZones.id, id))
        .returning({ id: freeZones.id });
        
      if (!result.length) {
        throw new NotFoundException('Free Zone', id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new DatabaseException('Failed to update free zone', { originalError: error.message });
    }
  }

  // Delete a free zone
  async deleteFreeZone(id: number): Promise<void> {
    try {
      const result = await db
        .delete(freeZones)
        .where(eq(freeZones.id, id))
        .returning({ id: freeZones.id });
        
      if (!result.length) {
        throw new NotFoundException('Free Zone', id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new DatabaseException('Failed to delete free zone', { originalError: error.message });
    }
  }

  /**
   * Business Activity Category Methods
   */
  
  // Get a business activity category by ID
  async getBusinessActivityCategory(id: number): Promise<BusinessActivityCategory | undefined> {
    try {
      const [category] = await db.select().from(businessActivityCategories).where(eq(businessActivityCategories.id, id));
      return category;
    } catch (error) {
      throw new DatabaseException('Failed to fetch business activity category', { originalError: error.message });
    }
  }

  // Get business activity categories by parent ID
  async getBusinessActivityCategoriesByParent(parentId: number | null): Promise<BusinessActivityCategory[]> {
    try {
      // If parentId is null, get root categories (no parent)
      if (parentId === null) {
        return await db
          .select()
          .from(businessActivityCategories)
          .where(sql`${businessActivityCategories.parentId} IS NULL`)
          .orderBy(asc(businessActivityCategories.order), asc(businessActivityCategories.name));
      }
      
      // Otherwise, get categories with the specified parent
      return await db
        .select()
        .from(businessActivityCategories)
        .where(eq(businessActivityCategories.parentId, parentId))
        .orderBy(asc(businessActivityCategories.order), asc(businessActivityCategories.name));
    } catch (error) {
      throw new DatabaseException('Failed to fetch business activity categories by parent', { originalError: error.message });
    }
  }

  // Get all business activity categories
  async getAllBusinessActivityCategories(): Promise<BusinessActivityCategory[]> {
    try {
      return await db
        .select()
        .from(businessActivityCategories)
        .orderBy(asc(businessActivityCategories.order), asc(businessActivityCategories.name));
    } catch (error) {
      throw new DatabaseException('Failed to fetch all business activity categories', { originalError: error.message });
    }
  }

  // Create a business activity category
  async createBusinessActivityCategory(category: InsertBusinessActivityCategory): Promise<BusinessActivityCategory> {
    try {
      const [createdCategory] = await db
        .insert(businessActivityCategories)
        .values(category)
        .returning();
      return createdCategory;
    } catch (error) {
      throw new DatabaseException('Failed to create business activity category', { originalError: error.message });
    }
  }

  // Update a business activity category
  async updateBusinessActivityCategory(id: number, category: Partial<BusinessActivityCategory>): Promise<void> {
    try {
      const result = await db
        .update(businessActivityCategories)
        .set({
          ...category,
          updatedAt: new Date()
        })
        .where(eq(businessActivityCategories.id, id))
        .returning({ id: businessActivityCategories.id });
        
      if (!result.length) {
        throw new NotFoundException('Business Activity Category', id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new DatabaseException('Failed to update business activity category', { originalError: error.message });
    }
  }

  /**
   * Business Activity Methods
   */
  
  // Get a business activity by ID
  async getBusinessActivity(id: number): Promise<BusinessActivity | undefined> {
    try {
      const [activity] = await db.select().from(businessActivities).where(eq(businessActivities.id, id));
      return activity;
    } catch (error) {
      throw new DatabaseException('Failed to fetch business activity', { originalError: error.message });
    }
  }

  // Get business activities by category ID
  async getBusinessActivitiesByCategory(categoryId: number): Promise<BusinessActivity[]> {
    try {
      return await db
        .select()
        .from(businessActivities)
        .where(eq(businessActivities.categoryId, categoryId))
        .orderBy(asc(businessActivities.name));
    } catch (error) {
      throw new DatabaseException('Failed to fetch business activities by category', { originalError: error.message });
    }
  }

  // Get business activities by ISIC code
  async getBusinessActivitiesByIsicCode(isicCode: string): Promise<BusinessActivity[]> {
    try {
      return await db
        .select()
        .from(businessActivities)
        .where(eq(businessActivities.isicCode, isicCode))
        .orderBy(asc(businessActivities.name));
    } catch (error) {
      throw new DatabaseException('Failed to fetch business activities by ISIC code', { originalError: error.message });
    }
  }

  // Search business activities
  async searchBusinessActivities(query: string, limit: number = 50, offset: number = 0): Promise<BusinessActivity[]> {
    try {
      return await db
        .select()
        .from(businessActivities)
        .where(
          sql`(${businessActivities.name} ILIKE ${'%' + query + '%'} OR 
               ${businessActivities.description} ILIKE ${'%' + query + '%'} OR 
               ${businessActivities.code} ILIKE ${'%' + query + '%'} OR 
               ${businessActivities.isicCode} ILIKE ${'%' + query + '%'})`
        )
        .limit(limit)
        .offset(offset)
        .orderBy(asc(businessActivities.name));
    } catch (error) {
      throw new DatabaseException('Failed to search business activities', { originalError: error.message });
    }
  }

  // Additional repository methods for other entities would be added here
}