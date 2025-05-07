import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { RateLimitException } from '../../../shared/errors';

/**
 * Configure rate limiters for different endpoints
 */

// Standard API rate limiter (100 requests per minute)
const standardLimiter = new RateLimiterMemory({
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 1 minute if exceeded
});

// Login/Auth endpoint rate limiter (10 requests per minute)
const authLimiter = new RateLimiterMemory({
  points: 10, // Number of points
  duration: 60, // Per 60 seconds
  blockDuration: 300, // Block for 5 minutes if exceeded
});

// Document upload rate limiter (20 uploads per hour)
const uploadLimiter = new RateLimiterMemory({
  points: 20, // Number of points
  duration: 3600, // Per hour
  blockDuration: 3600, // Block for 1 hour if exceeded
});

// Rate limiter middleware factory
const createRateLimiterMiddleware = (limiter: RateLimiterMemory) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get client identifier (IP or user ID if authenticated)
      const clientId = req.user?.userId || req.ip;
      
      // Consume points
      await limiter.consume(clientId);
      next();
    } catch (error) {
      if (error.remainingPoints === 0) {
        // Rate limit exceeded
        next(new RateLimitException(
          'Rate limit exceeded. Please try again later.',
          {
            retryAfter: error.msBeforeNext / 1000, // Convert to seconds
            limit: limiter.points,
            windowMs: limiter.duration * 1000
          }
        ));
      } else {
        // Other error
        next(error);
      }
    }
  };
};

// Export configured middleware
export const standardRateLimiter = createRateLimiterMiddleware(standardLimiter);
export const authRateLimiter = createRateLimiterMiddleware(authLimiter);
export const uploadRateLimiter = createRateLimiterMiddleware(uploadLimiter);