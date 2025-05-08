/**
 * JWT Authentication Middleware
 * 
 * Validates JWT tokens and attaches the user to the request
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/ApiError';
import { config } from '../config';

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

/**
 * Extract token from request headers, cookies, or query params
 */
const extractToken = (req: Request): string | null => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // Check cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // Check query params (less secure, only for specific cases)
  if (req.query && req.query.token) {
    return req.query.token as string;
  }

  return null;
};

/**
 * Verify and decode JWT token
 */
const verifyToken = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.userService.jwtSecret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

/**
 * Authentication middleware - validates JWT and attaches user to request
 * Use this middleware in routes that require authentication
 */
export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token
    const token = extractToken(req);
    if (!token) {
      return next(
        new UnauthorizedError('Authentication required', 'AUTH_REQUIRED')
      );
    }

    // Verify token
    const decoded = await verifyToken(token);
    
    // Attach user and token to request
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error: any) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      // Let the error handler handle JWT-specific errors
      next(error);
    } else {
      next(
        new UnauthorizedError('Authentication failed', 'AUTH_FAILED')
      );
    }
  }
};

/**
 * Role-based authorization middleware
 * Use this middleware after authenticateJwt to check user roles
 */
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new UnauthorizedError('Authentication required', 'AUTH_REQUIRED')
      );
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return next(
        new UnauthorizedError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS')
      );
    }
    
    next();
  };
};