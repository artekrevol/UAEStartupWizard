/**
 * Shared Authentication Middleware
 * 
 * Reusable authentication middleware for all microservices
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ServiceException, ErrorCode } from '../errors';

// Interface for JWT payload
export interface JwtPayload {
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
  // Get token from header or from x-user-id if we're behind API Gateway
  const authHeader = req.headers.authorization;
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  
  // If we're behind API Gateway, trust the headers it sets
  if (userId && userRole) {
    req.user = {
      userId: parseInt(userId as string),
      email: '',  // Email isn't passed for security reasons
      role: userRole as string
    };
    return next();
  }
  
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
    { path: '/login', method: 'POST' },
    { path: '/register', method: 'POST' },
    { path: '/password-reset-request', method: 'POST' },
    { path: '/health', method: '*' }
    // Add other public routes as needed
  ];
  
  return publicRoutes.some(route => 
    (route.path === path || path.startsWith(`${route.path}/`)) && 
    (route.method === '*' || route.method === method)
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
