/**
 * Shared Logger for all services
 * Provides consistent logging across the application
 */

// Simple logger implementation
// In a production environment, this would be replaced with Winston or similar
export const logger = {
  /**
   * Log debug level message
   */
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  },
  
  /**
   * Log info level message
   */
  info: (message: string, meta?: Record<string, any>) => {
    console.info(`[INFO] ${message}`, meta || '');
  },
  
  /**
   * Log warning level message
   */
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  
  /**
   * Log error level message
   */
  error: (message: string, meta?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, meta || '');
  }
};