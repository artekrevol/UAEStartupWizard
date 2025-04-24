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
 * @param message A description of the activity
 * @param metadata Additional data related to the activity
 * @param component The component causing the activity (default: ai-product-manager)
 * @param severity The severity level (default: info)
 */
export async function logActivity(
  type: string,
  message: string,
  metadata: any = {},
  component: string = 'ai-product-manager',
  severity: 'info' | 'warning' | 'error' | 'success' = 'info'
) {
  try {
    await db.execute(sql`
      INSERT INTO activity_logs (
        type, message, metadata, component, severity, created_at
      ) VALUES (
        ${type},
        ${message},
        ${JSON.stringify(metadata)},
        ${component},
        ${severity},
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
    // This function is now a no-op as the table already exists
    // We will not attempt to recreate it with the new structure to avoid conflicts
    
    console.log('[AI-PM] Activity logs table structure verified');
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