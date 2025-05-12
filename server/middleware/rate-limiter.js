/**
 * API Rate Limiter Middleware
 * 
 * Implements rate limiting for API requests to prevent abuse.
 */

import { rateLimit } from 'express-rate-limit';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// In-memory rate limiter for burst protection
const rateLimiterMemory = new RateLimiterMemory({
  points: 10, // Number of points
  duration: 1, // Per second
});

// Express rate limiter middleware
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Too many requests, please try again later.',
  },
  // Skip rate limiting for internal requests or specific IPs
  skip: (req) => {
    // Allow internal network traffic
    const ip = req.ip || req.connection.remoteAddress;
    return ip === '127.0.0.1' || ip === '::1';
  },
  // Additional protection against burst attacks
  handler: async (req, res, next) => {
    try {
      // Try to consume points
      await rateLimiterMemory.consume(req.ip, 1);
      next();
    } catch (error) {
      res.status(429).json({
        status: 429,
        message: 'Too many requests in a short time, please slow down.',
      });
    }
  },
});

// Higher limit for specific endpoints that need it
export const relaxedRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Higher limit
  message: {
    status: 429,
    message: 'Too many requests, please try again later.',
  },
});

// Very strict rate limiter for sensitive endpoints like login
export const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login attempts per hour
  message: {
    status: 429,
    message: 'Too many authentication attempts, please try again later.',
  },
});