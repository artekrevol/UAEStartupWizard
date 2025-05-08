import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// General API rate limiter - 100 requests per minute per IP
const apiLimiter = new RateLimiterMemory({
  points: 100, // Number of points
  duration: 60, // Per 60 seconds
});

// More strict rate limiter for auth endpoints - 20 requests per minute per IP
const authLimiter = new RateLimiterMemory({
  points: 20, // Number of points
  duration: 60, // Per 60 seconds
  blockDuration: 300, // Block for 5 minutes if exceeded
});

// Limiter for OpenAI endpoints - 50 requests per minute per IP
export const openaiLimiter = new RateLimiterMemory({
  points: 50, // Number of points
  duration: 60, // Per 60 seconds
});

/**
 * Rate limiting middleware for general API endpoints
 */
export function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Get a unique identifier for the client (IP address)
  const clientId = req.ip || 'unknown';
  
  apiLimiter.consume(clientId)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).json({ 
        error: 'Too many requests, please try again later.',
        retryAfter: 60 // Suggested retry after 60 seconds
      });
    });
}

/**
 * Rate limiting middleware for authentication endpoints
 */
export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Get a unique identifier for the client (IP address)
  const clientId = req.ip || 'unknown';
  
  authLimiter.consume(clientId)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).json({ 
        error: 'Too many login attempts, please try again later.',
        retryAfter: 300 // Suggested retry after 5 minutes
      });
    });
}

/**
 * Apply OpenAI rate limiter and return a promise to be used in OpenAI service calls
 */
export async function applyOpenAIRateLimit(clientId: string) {
  try {
    await openaiLimiter.consume(clientId);
    return true;
  } catch (error) {
    throw new Error('OpenAI rate limit exceeded, please try again later.');
  }
}
