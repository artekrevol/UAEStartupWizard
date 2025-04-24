/**
 * AI Product Manager Logger
 * 
 * This module handles logging for the AI Product Manager activities.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

interface LogParams {
  component?: string;
  severity?: string;
  message: string;
  metadata?: any;
}

/**
 * Log an activity performed by the AI Product Manager
 */
export async function logActivity(
  type: string,
  message: string,
  metadata: any = {},
  component: string = 'ai-product-manager',
  severity: string = 'info'
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO activity_logs 
      (type, component, message, severity, metadata, created_at)
      VALUES 
      (${type}, ${component}, ${message}, ${severity}, ${JSON.stringify(metadata)}, NOW())
    `);
    
    console.log(`[AI-PM] ${type}: ${message}`);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * Get recent logs for the AI Product Manager
 */
export async function getRecentLogs(limit: number = 50): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT * FROM activity_logs
      WHERE component = 'ai-product-manager'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching recent logs:', error);
    return [];
  }
}

/**
 * Clear all logs for the AI Product Manager
 */
export async function clearLogs(): Promise<{ success: boolean; message: string }> {
  try {
    await db.execute(sql`
      DELETE FROM activity_logs
      WHERE component = 'ai-product-manager'
    `);
    
    return { success: true, message: 'Logs cleared successfully' };
  } catch (error) {
    console.error('Error clearing logs:', error);
    return { 
      success: false, 
      message: `Failed to clear logs: ${(error as Error).message}` 
    };
  }
}