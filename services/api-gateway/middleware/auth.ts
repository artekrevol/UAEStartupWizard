import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ServiceException, ErrorCode } from '../../../shared/errors';

/**
 * Interface for JWT payload
 */
export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  exp?: number;
  iat?: number;
}

/**
 * Extended Express Request with user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Get JWT secret from environment variables
 */
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    console.error('JWT_SECRET environment variable is not set');
    throw new ServiceException(
      ErrorCode.UNAUTHORIZED,
      'Authentication configuration error',
      undefined,
      500
    );
  }
  
  return secret;
};

/**
 * Authenticate JWT middleware
 * Verifies JWT token from Authorization header and attaches user to request
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Authorization header is missing',
        undefined,
        401
      );
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Bearer token is missing',
        undefined,
        401
      );
    }
    
    // Verify token
    try {
      const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
      req.user = payload;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ServiceException(
          ErrorCode.SESSION_EXPIRED,
          'Your session has expired. Please login again.',
          undefined,
          401
        );
      } else {
        throw new ServiceException(
          ErrorCode.UNAUTHORIZED,
          'Invalid authentication token',
          undefined,
          401
        );
      }
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional JWT authentication middleware
 * Tries to verify JWT token but continues if token is invalid or missing
 */
export const optionalAuthenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    
    // If no header or token, continue
    if (!authHeader) {
      return next();
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    // Try to verify token
    try {
      const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
      req.user = payload;
    } catch (error) {
      // Continue even if token is invalid
      // Just don't set the user
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require admin role middleware
 * Must be used after authenticateJWT
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        undefined,
        401
      );
    }
    
    if (req.user.role !== 'admin') {
      throw new ServiceException(
        ErrorCode.FORBIDDEN,
        'Admin role required',
        undefined,
        403
      );
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn: string = '24h'): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

/**
 * Validate JWT token
 */
export const validateToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ServiceException(
        ErrorCode.SESSION_EXPIRED,
        'Your session has expired. Please login again.',
        undefined,
        401
      );
    } else {
      throw new ServiceException(
        ErrorCode.UNAUTHORIZED,
        'Invalid authentication token',
        undefined,
        401
      );
    }
  }
};