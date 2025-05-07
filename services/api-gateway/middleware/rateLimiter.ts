import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Default options for the rate limiter
const defaultOptions = {
  windowMs: 60 * 1000, // 1 minute in milliseconds
  max: 100, // maximum requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Do not send the `X-RateLimit-*` headers
  message: 'Too many requests, please try again later.'
};

/**
 * Creates rate limiting middleware with custom options
 * 
 * @param {Object} options - Custom options for the rate limiter
 * @returns {Function} Express middleware function
 */
export const rateLimiter = (options: {
  windowMs?: number;
  max?: number;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  message?: string;
} = {}) => {
  // Merge default options with provided options
  const config = { ...defaultOptions, ...options };
  
  // Create rate limiter instance
  const limiter = new RateLimiterMemory({
    points: config.max, // Maximum number of points
    duration: config.windowMs / 1000, // Duration in seconds
  });
  
  // Return the middleware function
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use IP address as the key for rate limiting
      // In production, you might want to use a more sophisticated approach
      const key = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      
      // Consume points
      await limiter.consume(key);
      
      // If standard headers are enabled, add rate limit info
      if (config.standardHeaders) {
        const rateLimitInfo = await limiter.get(key);
        if (rateLimitInfo) {
          res.setHeader('RateLimit-Limit', config.max);
          res.setHeader('RateLimit-Remaining', config.max - rateLimitInfo.consumedPoints);
          
          const resetTime = new Date(Date.now() + rateLimitInfo.msBeforeNext);
          res.setHeader('RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000));
        }
      }
      
      // If legacy headers are enabled, add X-RateLimit headers
      if (config.legacyHeaders) {
        const rateLimitInfo = await limiter.get(key);
        if (rateLimitInfo) {
          res.setHeader('X-RateLimit-Limit', config.max);
          res.setHeader('X-RateLimit-Remaining', config.max - rateLimitInfo.consumedPoints);
          
          const resetTime = new Date(Date.now() + rateLimitInfo.msBeforeNext);
          res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000));
        }
      }
      
      // Proceed to the next middleware
      next();
    } catch (error) {
      // If rate limit is exceeded
      if (error.name === 'Error') {
        // Set headers
        if (config.standardHeaders) {
          res.setHeader('RateLimit-Limit', config.max);
          res.setHeader('RateLimit-Remaining', 0);
          
          const retryAfter = Math.ceil(error.msBeforeNext / 1000) || 60;
          res.setHeader('RateLimit-Reset', Math.ceil((Date.now() + error.msBeforeNext) / 1000));
          res.setHeader('Retry-After', retryAfter);
        }
        
        // Return rate limit exceeded error
        return res.status(429).json({
          status: 'error',
          message: config.message
        });
      }
      
      // For other errors, pass to the next error handler
      next(error);
    }
  };
};

// Create default global rate limiter
export const globalRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // limit each IP to 300 requests per minute
  message: 'Too many requests from this IP, please try again after a minute'
});