import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ServiceException, ErrorCode } from '../../../shared/errors';

/**
 * JWT Payload structure
 */
interface JwtPayload {
  userId: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * List of routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  { path: '/api/auth/login', method: 'POST' },
  { path: '/api/auth/register', method: 'POST' },
  { path: '/api/auth/forgot-password', method: 'POST' },
  { path: '/api/auth/reset-password', method: 'POST' },
  { path: '/health', method: 'GET' },
  { path: '/api/health', method: 'GET' },
];

/**
 * Middleware to authenticate JWT tokens
 * Validates token and attaches user info to request object
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication for public routes
  if (isPublicRoute(req.path, req.method)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ServiceException(
      ErrorCode.UNAUTHORIZED,
      'Access denied. No token provided.'
    ));
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable not set');
      return next(new ServiceException(
        ErrorCode.INTERNAL_ERROR,
        'Authentication service configuration error'
      ));
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Attach user info to request
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ServiceException(
        ErrorCode.TOKEN_EXPIRED,
        'Token expired'
      ));
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ServiceException(
        ErrorCode.INVALID_TOKEN,
        'Invalid token'
      ));
    }
    
    return next(new ServiceException(
      ErrorCode.UNAUTHORIZED,
      'Failed to authenticate token'
    ));
  }
};

/**
 * Check if a route is public (doesn't require authentication)
 */
export const isPublicRoute = (path: string, method: string): boolean => {
  return PUBLIC_ROUTES.some(
    route => 
      (route.path === path || (route.path.endsWith('*') && path.startsWith(route.path.slice(0, -1)))) && 
      (route.method === method || route.method === '*')
  );
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ServiceException(
      ErrorCode.UNAUTHORIZED,
      'Authentication required'
    ));
  }
  
  if (req.user.role !== 'admin') {
    return next(new ServiceException(
      ErrorCode.FORBIDDEN,
      'Admin privileges required for this operation'
    ));
  }
  
  next();
};

/**
 * Middleware to check if user has analyst role or higher
 */
export const requireAnalyst = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ServiceException(
      ErrorCode.UNAUTHORIZED,
      'Authentication required'
    ));
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'analyst') {
    return next(new ServiceException(
      ErrorCode.FORBIDDEN,
      'Analyst privileges required for this operation'
    ));
  }
  
  next();
};

/**
 * Middleware to check if user is accessing their own resources
 * or has admin privileges
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Authentication required'
      ));
    }
    
    const paramUserId = parseInt(req.params[userIdParam], 10);
    
    if (isNaN(paramUserId)) {
      return next(new ServiceException(
        ErrorCode.INVALID_INPUT,
        `Invalid user ID parameter: ${userIdParam}`
      ));
    }
    
    // Allow if user is admin or if they're accessing their own resources
    if (req.user.role === 'admin' || req.user.userId === paramUserId) {
      return next();
    }
    
    return next(new ServiceException(
      ErrorCode.FORBIDDEN,
      'You are not authorized to access this resource'
    ));
  };
};