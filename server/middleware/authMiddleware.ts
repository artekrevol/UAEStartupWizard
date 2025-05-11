/**
 * Authentication Middleware
 * 
 * This middleware provides authentication checks and role-based access control
 * for protecting routes.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if a user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

/**
 * Middleware to check if a user is an admin
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Forbidden - Admin access required' });
}

/**
 * Middleware to check if user has a specific role
 */
export function hasRole(role: string) {
  return function(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && req.user.role === role) {
      return next();
    }
    res.status(403).json({ error: `Forbidden - ${role} access required` });
  };
}