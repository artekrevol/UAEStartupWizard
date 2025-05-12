/**
 * User Interaction Tracking Service
 * 
 * This service provides functionality to track and analyze user interactions
 * with the application. It records events like page views, button clicks,
 * form submissions, etc. to help understand user behavior and improve the product.
 */

import { db } from '../db';
import { userInteractions, InsertUserInteraction } from '@shared/schema';
import { eq, and, desc, like, sql } from 'drizzle-orm';

/**
 * Records a user interaction in the database
 */
export async function recordUserInteraction(interaction: InsertUserInteraction) {
  try {
    const [result] = await db.insert(userInteractions).values(interaction).returning();
    return result;
  } catch (error) {
    console.error('Error recording user interaction:', error);
    throw error;
  }
}

/**
 * Get user interactions with pagination support
 */
export async function getUserInteractions(
  page = 1, 
  limit = 50, 
  filters?: { 
    userId?: number;
    username?: string;
    interactionType?: string;
    fromDate?: Date;
    toDate?: Date;
    pageUrl?: string;
  }
) {
  try {
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    let conditions = [] as any[];
    
    if (filters?.userId) {
      conditions.push(eq(userInteractions.userId, filters.userId));
    }
    
    if (filters?.username) {
      conditions.push(like(userInteractions.username, `%${filters.username}%`));
    }
    
    if (filters?.interactionType) {
      conditions.push(eq(userInteractions.interactionType, filters.interactionType));
    }
    
    if (filters?.pageUrl) {
      conditions.push(like(userInteractions.pageUrl, `%${filters.pageUrl}%`));
    }
    
    if (filters?.fromDate) {
      conditions.push(sql`${userInteractions.createdAt} >= ${filters.fromDate}`);
    }
    
    if (filters?.toDate) {
      conditions.push(sql`${userInteractions.createdAt} <= ${filters.toDate}`);
    }
    
    // Execute query
    const baseQuery = conditions.length > 0 
      ? db.select().from(userInteractions).where(and(...conditions))
      : db.select().from(userInteractions);
      
    const data = await baseQuery
      .orderBy(desc(userInteractions.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(userInteractions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = countResult[0]?.count || 0;
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error fetching user interactions:', error);
    throw error;
  }
}

/**
 * Get user interaction statistics
 */
export async function getUserInteractionStats(
  timeframe: 'day' | 'week' | 'month' | 'year' = 'day',
  filters?: { 
    userId?: number;
    interactionType?: string;
    fromDate?: Date;
    toDate?: Date;
  }
) {
  try {
    // Build filter conditions
    let conditions = [] as any[];
    
    if (filters?.userId) {
      conditions.push(eq(userInteractions.userId, filters.userId));
    }
    
    if (filters?.interactionType) {
      conditions.push(eq(userInteractions.interactionType, filters.interactionType));
    }
    
    if (filters?.fromDate) {
      conditions.push(sql`${userInteractions.createdAt} >= ${filters.fromDate}`);
    }
    
    if (filters?.toDate) {
      conditions.push(sql`${userInteractions.createdAt} <= ${filters.toDate}`);
    }
    
    // Get statistics based on interaction type
    const interactionTypeStats = await db
      .select({
        type: userInteractions.interactionType,
        count: sql<number>`count(*)`,
      })
      .from(userInteractions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(userInteractions.interactionType)
      .orderBy(sql<number>`count(*)` as any, 'desc');
    
    // Get time-based statistics with appropriate grouping
    let timeGrouping;
    switch (timeframe) {
      case 'day':
        timeGrouping = sql`date_trunc('hour', ${userInteractions.createdAt})`;
        break;
      case 'week':
        timeGrouping = sql`date_trunc('day', ${userInteractions.createdAt})`;
        break;
      case 'month':
        timeGrouping = sql`date_trunc('day', ${userInteractions.createdAt})`;
        break;
      case 'year':
        timeGrouping = sql`date_trunc('month', ${userInteractions.createdAt})`;
        break;
      default:
        timeGrouping = sql`date_trunc('hour', ${userInteractions.createdAt})`;
    }
    
    const timeStats = await db
      .select({
        time: timeGrouping,
        count: sql<number>`count(*)`,
      })
      .from(userInteractions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(timeGrouping)
      .orderBy(timeGrouping);
    
    // Get user statistics if no specific user is filtered
    let userStats = [];
    if (!filters?.userId) {
      userStats = await db
        .select({
          userId: userInteractions.userId,
          username: userInteractions.username,
          count: sql<number>`count(*)`,
        })
        .from(userInteractions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(userInteractions.userId, userInteractions.username)
        .orderBy(sql<number>`count(*)` as any, 'desc')
        .limit(20);
    }
    
    return {
      interactionTypeStats,
      timeStats,
      userStats,
      totalInteractions: interactionTypeStats.reduce((sum, stat) => sum + Number(stat.count), 0)
    };
  } catch (error) {
    console.error('Error fetching user interaction statistics:', error);
    throw error;
  }
}

/**
 * Delete user interactions that are older than a certain date
 */
export async function deleteOldUserInteractions(olderThan: Date) {
  try {
    const result = await db
      .delete(userInteractions)
      .where(sql`${userInteractions.createdAt} < ${olderThan}`)
      .returning({ id: userInteractions.id });
    
    return { 
      deletedCount: result.length,
      success: true
    };
  } catch (error) {
    console.error('Error deleting old user interactions:', error);
    throw error;
  }
}