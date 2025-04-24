/**
 * AI Product Manager - Activity Logger
 * 
 * This module provides logging functionality for the AI Product Manager,
 * recording all activities for auditing, monitoring and debugging.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Log an activity in the AI Product Manager
 * @param type The type of activity
 * @param description A description of the activity
 * @param payload Additional data related to the activity
 * @param category The category of the activity (default: ai-product-manager)
 * @param level The log level (default: info)
 */
export async function logActivity(
  type: string,
  description: string,
  payload: any = {},
  category: string = 'ai-product-manager',
  level: 'info' | 'warning' | 'error' | 'success' = 'info'
) {
  try {
    await db.execute(sql`
      INSERT INTO activity_logs (
        type, description, payload, category, level, created_at
      ) VALUES (
        ${type},
        ${description},
        ${JSON.stringify(payload)},
        ${category},
        ${level},
        NOW()
      )
    `);
  } catch (error) {
    console.error(`Error logging activity: ${error}`);
    // Don't throw here to prevent logging errors from affecting the application
  }
}

/**
 * Get activity logs, optionally filtered by type
 * @param limit Maximum number of logs to return
 * @param type Optional type filter
 * @returns Array of activity logs
 */
export async function getActivityLogs(limit: number = 50, type?: string) {
  try {
    let query = sql`
      SELECT * FROM activity_logs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    
    if (type) {
      query = sql`
        SELECT * FROM activity_logs
        WHERE type = ${type}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }
    
    const result = await db.execute(query);
    return result.rows;
  } catch (error) {
    console.error(`Error retrieving activity logs: ${error}`);
    return [];
  }
}

/**
 * Setup the activity logs table if it doesn't exist
 */
export async function setupActivityLogsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        payload JSONB,
        category VARCHAR(50) DEFAULT 'ai-product-manager',
        level VARCHAR(20) DEFAULT 'info',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('[AI-PM] Activity logs table created or verified');
    return true;
  } catch (error) {
    console.error(`Error setting up activity logs table: ${error}`);
    return false;
  }
}

/**
 * Clear all activity logs
 */
export async function clearActivityLogs() {
  try {
    await db.execute(sql`
      DELETE FROM activity_logs
    `);
    
    console.log('[AI-PM] Activity logs cleared');
    return true;
  } catch (error) {
    console.error(`Error clearing activity logs: ${error}`);
    return false;
  }
}

// Initialize the activity logs table when this module is imported
setImmediate(setupActivityLogsTable);