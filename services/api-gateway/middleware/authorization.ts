import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to authorize admin access
 * 
 * This middleware checks if the authenticated user has an admin role.
 * It should be used after the authenticate middleware.
 */
export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
  // The authenticate middleware should have attached the user object
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: Admin privileges required'
    });
  }

  // User is an admin, proceed to the next middleware
  next();
};

/**
 * Middleware to authorize specific roles
 * 
 * This middleware checks if the authenticated user has one of the allowed roles.
 * It should be used after the authenticate middleware.
 */
export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // The authenticate middleware should have attached the user object
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Access denied: Required role not found`
      });
    }

    // User has an allowed role, proceed to the next middleware
    next();
  };
};

/**
 * Middleware to authorize resource owners
 * 
 * This middleware checks if the authenticated user is the owner of the resource.
 * It should be used after the authenticate middleware.
 * 
 * @param {Function} extractResourceOwnerId - Function to extract the owner ID from the request
 */
export const authorizeOwner = (extractResourceOwnerId: (req: Request) => Promise<number | undefined>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // The authenticate middleware should have attached the user object
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    try {
      // Extract the resource owner ID
      const ownerId = await extractResourceOwnerId(req);
      
      // If no owner ID could be extracted, or it doesn't match the user ID
      if (ownerId === undefined || ownerId !== req.user.userId) {
        // If user is an admin, allow access regardless of ownership
        if (req.user.role === 'admin') {
          return next();
        }
        
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You do not have permission to access this resource'
        });
      }

      // User is the resource owner, proceed to the next middleware
      next();
    } catch (error) {
      console.error('[Authorization] Error checking resource ownership:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to verify resource ownership',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};