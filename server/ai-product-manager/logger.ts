/**
 * Logger for AI Product Manager activities
 * 
 * This module handles logging of all AI Product Manager activities
 * for tracking, auditing, and debugging purposes.
 */

import { db } from '../db';
import * as fs from 'fs';
import * as path from 'path';

// Create a logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const productManagerLogFile = path.join(logsDir, 'ai-product-manager.log');

/**
 * Log an activity of the AI Product Manager
 */
export async function logActivity(
  activityType: 'analyze' | 'research' | 'enrich' | 'scraper' | 'recommendations' | 'enhancement' | 'cycle',
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      activityType,
      message,
      metadata: metadata || {}
    };
    
    // Log to console
    console.log(`[AI Product Manager] [${activityType}] ${message}`);
    
    // Log to file
    fs.appendFileSync(
      productManagerLogFile,
      JSON.stringify(logEntry) + '\n',
      { encoding: 'utf8' }
    );
    
    // We could also store logs in the database for better querying
    // This would require creating a new table in the schema
    
  } catch (error) {
    console.error(`Error logging AI Product Manager activity: ${error}`);
  }
}

/**
 * Get recent activity logs
 */
export function getRecentLogs(limit: number = 100): any[] {
  try {
    if (!fs.existsSync(productManagerLogFile)) {
      return [];
    }
    
    const logs = fs.readFileSync(productManagerLogFile, 'utf8')
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line))
      .reverse()
      .slice(0, limit);
    
    return logs;
  } catch (error) {
    console.error(`Error retrieving AI Product Manager logs: ${error}`);
    return [];
  }
}

/**
 * Clear all logs
 */
export function clearLogs(): boolean {
  try {
    if (fs.existsSync(productManagerLogFile)) {
      fs.writeFileSync(productManagerLogFile, '', 'utf8');
    }
    return true;
  } catch (error) {
    console.error(`Error clearing AI Product Manager logs: ${error}`);
    return false;
  }
}