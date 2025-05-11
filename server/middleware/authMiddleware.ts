import { Request, Response, NextFunction } from 'express';
import { verifyJWT, requireRole, requireAdmin, requirePremiumUser } from './jwtMiddleware';
import { storage } from '../storage';

/**
 * Middleware to protect routes that require authentication
 * This combines both session-based and JWT-based authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // If already authenticated via session
  if (req.isAuthenticated()) {
    return next();
  }

  // Otherwise, try JWT authentication
  verifyJWT(req, res, next);
}

/**
 * Middleware to verify email is verified
 * Must be used after an authentication middleware
 */
export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  // First make sure the user is authenticated
  if (!req.isAuthenticated() && !req.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const checkVerification = async () => {
    let userId = req.userId;
    
    // If we have session auth but no JWT auth
    if (!userId && req.user) {
      userId = (req.user as any).id;
    }
    
    // Get user from database to check email verification
    const user = await storage.getUser(userId as number);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.email_verified) {
      return res.status(403).json({
        message: "Email not verified. Please check your email for verification instructions.",
        code: "EMAIL_NOT_VERIFIED"
      });
    }
    
    next();
  };
  
  checkVerification().catch(err => {
    console.error("Error checking email verification:", err);
    res.status(500).json({ message: "Server error" });
  });
}

/**
 * Middleware to check if terms are accepted
 * Must be used after an authentication middleware
 */
export function requireTermsAccepted(req: Request, res: Response, next: NextFunction) {
  // First make sure the user is authenticated
  if (!req.isAuthenticated() && !req.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const checkTerms = async () => {
    let userId = req.userId;
    
    // If we have session auth but no JWT auth
    if (!userId && req.user) {
      userId = (req.user as any).id;
    }
    
    // Get user from database to check terms acceptance
    const user = await storage.getUser(userId as number);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.terms_accepted) {
      return res.status(403).json({
        message: "Terms and conditions not accepted",
        code: "TERMS_NOT_ACCEPTED"
      });
    }
    
    next();
  };
  
  checkTerms().catch(err => {
    console.error("Error checking terms acceptance:", err);
    res.status(500).json({ message: "Server error" });
  });
}

/**
 * Combine common middleware for protected routes
 * Checks authentication, email verification, and terms acceptance
 */
export function fullProtection(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    
    requireVerifiedEmail(req, res, (err) => {
      if (err) return next(err);
      
      requireTermsAccepted(req, res, next);
    });
  });
}

// Export the role-based middleware from jwtMiddleware for convenience
export { requireRole, requireAdmin, requirePremiumUser };