/**
 * Authentication Middleware
 * Handles JWT authentication and authorization
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthException, ErrorCode } from '../errors';
import { logger } from '../logger';

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Validate JWT token and attach user info to request
 */
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthException(
        ErrorCode.UNAUTHORIZED,
        'Authentication required'
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AuthException(
        ErrorCode.UNAUTHORIZED,
        'Invalid authentication token'
      );
    }
    
    // Verify token
    jwt.verify(token, config.userService.jwtSecret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          throw new AuthException(
            ErrorCode.TOKEN_EXPIRED,
            'Authentication token expired'
          );
        }
        
        throw new AuthException(
          ErrorCode.INVALID_TOKEN,
          'Invalid authentication token'
        );
      }
      
      // Attach user info to request
      req.user = decoded as {
        userId: number;
        username: string;
        email: string;
        role: string;
      };
      
      next();
    });
  } catch (error) {
    logger.warn('[Auth] Authentication failed', {
      error: error.message,
      path: req.path
    });
    next(error);
  }
};

/**
 * Check if user has admin role
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    throw new AuthException(
      ErrorCode.UNAUTHORIZED,
      'Authentication required'
    );
  }
  
  if (req.user.role !== 'admin') {
    throw new AuthException(
      ErrorCode.FORBIDDEN,
      'Admin access required'
    );
  }
  
  next();
};

/**
 * Check if user has one of the specified roles
 * @param roles Array of allowed roles
 */
export const authorizeRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthException(
        ErrorCode.UNAUTHORIZED,
        'Authentication required'
      );
    }
    
    if (!roles.includes(req.user.role)) {
      throw new AuthException(
        ErrorCode.FORBIDDEN,
        `Access denied. Required roles: ${roles.join(', ')}`
      );
    }
    
    next();
  };
};