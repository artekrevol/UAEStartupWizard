/**
 * Application Logger Module
 * Provides standardized logging functionality across all services
 */

interface LogData {
  [key: string]: any;
}

/**
 * Logger Class 
 * Handles all logging operations with consistent formatting
 */
class Logger {
  /**
   * Log an informational message
   */
  info(message: string, data?: LogData): void {
    this.log('info', message, data);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, data?: LogData): void {
    this.log('warn', message, data);
  }
  
  /**
   * Log an error message
   */
  error(message: string, data?: LogData): void {
    this.log('error', message, data);
  }
  
  /**
   * Log a debug message (only in development)
   */
  debug(message: string, data?: LogData): void {
    if (process.env.NODE_ENV !== 'production') {
      this.log('debug', message, data);
    }
  }
  
  /**
   * Internal logging method that formats and outputs logs
   */
  private log(level: string, message: string, data?: LogData): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data || {})
    };
    
    // In production, we might use a more sophisticated logging service
    // For now, we'll use console methods based on log level
    switch (level) {
      case 'error':
        console.error(JSON.stringify(logEntry));
        break;
      case 'warn':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'debug':
        console.debug(JSON.stringify(logEntry));
        break;
      case 'info':
      default:
        console.log(JSON.stringify(logEntry));
        break;
    }
  }
}

// Export a singleton instance
export const logger = new Logger();