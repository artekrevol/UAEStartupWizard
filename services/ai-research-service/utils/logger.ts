/**
 * Logger Utility
 * 
 * This module provides a standardized logging interface for the AI Research Service.
 */

const SERVICE_NAME = 'ai-research-service';

// Define log levels
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Set current log level based on environment
const currentLogLevel = process.env.NODE_ENV === 'production' 
  ? LogLevel.INFO 
  : LogLevel.DEBUG;

/**
 * Logger for the AI Research Service
 */
class Logger {
  /**
   * Log an error message
   */
  error(message: string, ...args: any[]) {
    if (currentLogLevel >= LogLevel.ERROR) {
      console.error(`[${SERVICE_NAME}] ERROR: ${message}`, ...args);
    }
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]) {
    if (currentLogLevel >= LogLevel.WARN) {
      console.warn(`[${SERVICE_NAME}] WARN: ${message}`, ...args);
    }
  }
  
  /**
   * Log an info message
   */
  info(message: string, ...args: any[]) {
    if (currentLogLevel >= LogLevel.INFO) {
      console.log(`[${SERVICE_NAME}] INFO: ${message}`, ...args);
    }
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]) {
    if (currentLogLevel >= LogLevel.DEBUG) {
      console.log(`[${SERVICE_NAME}] DEBUG: ${message}`, ...args);
    }
  }
  
  /**
   * Log the start of an operation
   */
  startOperation(operation: string) {
    this.info(`Starting operation: ${operation}`);
    return new Date();
  }
  
  /**
   * Log the end of an operation with duration
   */
  endOperation(operation: string, startTime: Date) {
    const duration = new Date().getTime() - startTime.getTime();
    this.info(`Completed operation: ${operation} (duration: ${duration}ms)`);
  }
}

// Create and export a singleton logger instance
export const logger = new Logger();