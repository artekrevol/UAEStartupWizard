import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRY = '15m'; // Short-lived access token
const JWT_REFRESH_EXPIRY = '7d'; // Longer-lived refresh token
const JWT_REMEMBER_ME_EXPIRY = '30d'; // Extended expiry for "remember me"

// For TypeScript: Extend Express.Request type
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: string;
    }
  }
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(userId: number, role: string): string {
  return jwt.sign(
    { userId, role, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY }
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId: number, rememberMe: boolean = false): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: rememberMe ? JWT_REMEMBER_ME_EXPIRY : JWT_REFRESH_EXPIRY }
  );
}

/**
 * Middleware to verify JWT access token
 */
export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }
  
  const tokenParts = authHeader.split(' ');
  
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Invalid authorization format. Expected Bearer token' });
  }
  
  const token = tokenParts[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string; type: string };
    
    // Verify this is an access token
    if (decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    
    // Attach user info to request for downstream middleware
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        message: 'Token expired', 
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    return res.status(401).json({ message: 'Invalid token' });
  }
}

/**
 * Middleware to verify refresh token and issue new access token
 */
export async function refreshAccessToken(req: Request, res: Response) {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: number; type: string };
    
    // Verify this is a refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    
    // Get user from database to confirm existence and get current role
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Verify the refresh token matches what's stored
    if (user.refresh_token !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(user.id, user.role);
    
    res.json({ accessToken });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        message: 'Refresh token expired, please log in again', 
        code: 'REFRESH_TOKEN_EXPIRED' 
      });
    }
    
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

/**
 * Role-based access control middleware
 */
export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    // verifyJWT middleware should be called before this
    if (!req.userId || !req.userRole) {
      return res.status(401).json({ message: 'Unauthorized - Authentication required' });
    }
    
    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: `Forbidden - Required role: ${allowedRoles.join(' or ')}` 
      });
    }
    
    next();
  };
}

/**
 * Middleware to require premium user access
 */
export const requirePremiumUser = requireRole(['premium_user', 'admin', 'super_admin']);

/**
 * Middleware to require admin access
 */
export const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * Middleware to require super admin access
 */
export const requireSuperAdmin = requireRole('super_admin');