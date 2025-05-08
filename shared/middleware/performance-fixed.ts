/**
 * Performance Monitoring Middleware (Fixed Version)
 * This version uses event listeners instead of function overriding to avoid TypeScript errors
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export interface PerformanceOptions {
  slowThresholdMs?: number;  // Response time threshold to log warnings
  logAllRequests?: boolean;  // Whether to log all requests or just slow ones
  excludePaths?: string[];   // Paths to exclude from monitoring
  includeBody?: boolean;     // Whether to include request body in logs (careful with sensitive data)
}

const DEFAULT_OPTIONS: PerformanceOptions = {
  slowThresholdMs: 1000,     // Default 1 second threshold for slow responses
  logAllRequests: false,     // Only log slow responses by default
  excludePaths: [
    '/api/health',           // Exclude health check endpoints
    '/api/metrics',          // Exclude metrics endpoints
  ],
  includeBody: false,        // Don't include request body by default
};

/**
 * Middleware to track response times and log slow responses
 * @param options Performance monitoring options
 */
export function performanceMonitor(customOptions: PerformanceOptions = {}) {
  // Merge default options with custom options
  const options = { ...DEFAULT_OPTIONS, ...customOptions };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip excluded paths
    if (options.excludePaths?.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Record request start time
    const startTime = process.hrtime();
    
    // Add response listener to calculate duration
    res.on('finish', () => {
      // Calculate duration
      const hrDuration = process.hrtime(startTime);
      const durationMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000;
      
      // Determine if this is a slow response
      const isSlow = durationMs > (options.slowThresholdMs || DEFAULT_OPTIONS.slowThresholdMs!);
      
      // Add response time header if headers haven't been sent yet
      try {
        if (!res.headersSent) {
          res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
        }
      } catch (err) {
        // Headers might already be sent, just ignore
      }
      
      // Log slow responses or all responses if specified
      if (isSlow || options.logAllRequests) {
        const logLevel = isSlow ? 'warn' : 'info';
        const logMethod = logLevel === 'warn' ? logger.warn : logger.info;
        
        const logData: Record<string, any> = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: durationMs.toFixed(2),
          userAgent: req.get('user-agent') || 'unknown',
          ip: req.ip,
        };
        
        // Optionally include request body (be careful with sensitive data)
        if (options.includeBody && req.body && Object.keys(req.body).length > 0) {
          // Sanitize body by removing sensitive fields
          const sanitizedBody = { ...req.body };
          ['password', 'token', 'secret', 'apiKey'].forEach(key => {
            if (sanitizedBody[key]) sanitizedBody[key] = '[REDACTED]';
          });
          
          logData.body = sanitizedBody;
        }
        
        // Log with appropriate level
        const message = isSlow 
          ? `Slow response (${durationMs.toFixed(2)}ms)` 
          : `Request completed (${durationMs.toFixed(2)}ms)`;
          
        logMethod(message, logData);
      }
    });
    
    next();
  };
}