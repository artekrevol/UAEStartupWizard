/**
 * JWT Authentication Middleware
 * 
 * Verifies JWT tokens from various sources (Authorization header, cookies, query)
 * Supports role-based access control
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from '../errors/ApiError';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Authenticate JWT token and add user payload to request
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  // Extract token from Authorization header, cookies, or query param
  const token = extractToken(req);

  if (!token) {
    return next(new ApiError('Authentication required', 'AUTHENTICATION_REQUIRED', 401));
  }

  try {
    const decoded = jwt.verify(token, config.userService.jwtSecret);
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError('Token expired', 'TOKEN_EXPIRED', 401));
    }

    return next(new ApiError('Invalid token', 'INVALID_TOKEN', 401));
  }
};

/**
 * Authentication with specific role requirements
 * @param roles Array of allowed roles
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // First authenticate the JWT
    authenticateJWT(req, res, (err: Error | null) => {
      if (err) {
        return next(err);
      }

      // Check if user has one of the required roles
      if (!req.user || !roles.includes(req.user.role)) {
        return next(
          new ApiError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403)
        );
      }

      next();
    });
  };
};

/**
 * Utility function to extract token from request
 */
function extractToken(req: Request): string | null {
  // Check authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // Check query parameters
  if (req.query && req.query.token) {
    return req.query.token as string;
  }

  return null;
}

/**
 * Optional JWT authentication
 * Does not return error if token is missing, but will validate if present
 */
export const optionalJWT = (req: Request, res: Response, next: NextFunction) => {
  // Extract token from Authorization header, cookies, or query param
  const token = extractToken(req);

  if (!token) {
    return next(); // No token, but that's okay
  }

  try {
    const decoded = jwt.verify(token, config.userService.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    // Invalid token, but we'll proceed without user info
    next(); 
  }
};