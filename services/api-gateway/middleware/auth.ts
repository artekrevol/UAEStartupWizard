/**
 * Authentication Middleware for API Gateway
 * 
 * Handles JWT validation and authorization for protected routes
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ServiceException, ErrorCode } from '../../../shared/errors';

// Interface for JWT payload
interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware to validate JWT tokens and attach user info to request
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // No token provided, check if it's a public route
    if (isPublicRoute(req.path, req.method)) {
      return next();
    }
    
    return next(new ServiceException(
      ErrorCode.UNAUTHORIZED,
      'Authentication required'
    ));
  }
  
  const tokenParts = authHeader.split(' ');
  
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return next(new ServiceException(
      ErrorCode.INVALID_TOKEN,
      'Invalid token format. Use Bearer {token}'
    ));
  }
  
  const token = tokenParts[1];
  
  try {
    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Attach user info to request
    req.user = decoded;
    
    // Add user ID to headers for downstream services
    req.headers['x-user-id'] = decoded.userId.toString();
    req.headers['x-user-role'] = decoded.role;
    
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ServiceException(
        ErrorCode.TOKEN_EXPIRED,
        'Token has expired'
      ));
    }
    
    return next(new ServiceException(
      ErrorCode.INVALID_TOKEN,
      'Invalid token'
    ));
  }
}

/**
 * Check if a route is public (doesn't require authentication)
 */
export function isPublicRoute(path: string, method: string): boolean {
  const publicRoutes = [
    { path: '/api/auth/login', method: 'POST' },
    { path: '/api/auth/register', method: 'POST' },
    { path: '/api/freezone/public', method: 'GET' },
    { path: '/api/freezone/public/', method: 'GET' },
    { path: '/api/health', method: '*' },
    { path: '/api/docs', method: 'GET' }
    // Add other public routes as needed
  ];
  
  return publicRoutes.some(route => 
    path.startsWith(route.path) && (route.method === '*' || route.method === method)
  );
}

/**
 * Middleware to check if user has admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new ServiceException(
      ErrorCode.UNAUTHORIZED,
      'Authentication required'
    ));
  }
  
  if (req.user.role !== 'admin') {
    return next(new ServiceException(
      ErrorCode.FORBIDDEN,
      'Admin privileges required'
    ));
  }
  
  next();
}

/**
 * Middleware to check if user has analyst role or higher
 */
export function requireAnalyst(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new ServiceException(
      ErrorCode.UNAUTHORIZED,
      'Authentication required'
    ));
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'analyst') {
    return next(new ServiceException(
      ErrorCode.FORBIDDEN,
      'Analyst privileges required'
    ));
  }
  
  next();
}

/**
 * Middleware to check if user is accessing their own resources
 * or has admin privileges
 */
export function requireOwnership(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Authentication required'
      ));
    }
    
    const resourceUserId = parseInt(req.params[userIdParam]);
    
    if (isNaN(resourceUserId)) {
      return next(new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        `Invalid user ID parameter: ${userIdParam}`
      ));
    }
    
    // Allow if user is admin or the resource owner
    if (req.user.role === 'admin' || req.user.userId === resourceUserId) {
      return next();
    }
    
    return next(new ServiceException(
      ErrorCode.FORBIDDEN,
      'You do not have permission to access this resource'
    ));
  };
}
