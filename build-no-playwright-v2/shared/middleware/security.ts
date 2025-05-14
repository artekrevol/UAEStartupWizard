/**
 * Security Middleware
 * 
 * Provides various security enhancements to protect against common web vulnerabilities
 * Combines several best practices for securing Express applications
 */
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config';
import { Request, Response, NextFunction } from 'express';

/**
 * Apply security headers using Helmet
 * Helps protect against various attacks by setting appropriate HTTP headers
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: config.security.contentSecurityPolicy?.enabled === true ? {
    directives: config.security.contentSecurityPolicy.directives,
  } : false,
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: 'same-site' },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Frameguard - prevent clickjacking
  frameguard: { action: 'deny' },
  
  // Hide Powered-By to avoid information disclosure
  hidePoweredBy: true,
  
  // HSTS - Force HTTPS
  hsts: {
    maxAge: 15552000, // 180 days
    includeSubDomains: true,
    preload: true,
  },
  
  // IE No Open - prevent IE from executing downloads
  ieNoOpen: true,
  
  // No Sniff - prevent MIME type sniffing
  noSniff: true,
  
  // Origin-Agent-Cluster header
  originAgentCluster: true,
  
  // Referrer Policy
  referrerPolicy: { policy: 'no-referrer' },
  
  // XSS Protection
  xssFilter: true,
});

/**
 * Standard rate limiter for API endpoints
 * Prevents abuse by limiting number of requests per time window
 */
export const standardRateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    status: 'error', 
    message: 'Too many requests, please try again later.' 
  }
});

/**
 * Strict rate limiter for sensitive operations
 * More restrictive than standard rate limiter
 */
export const strictRateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests / 3, // One third of standard limit
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    status: 'error', 
    message: 'Too many requests for sensitive operations, please try again later.' 
  }
});

/**
 * Prevent parameter pollution
 * Cleans up query parameters by removing duplicate keys
 */
export const preventParameterPollution = (req: Request, res: Response, next: NextFunction) => {
  if (req.query) {
    const cleanQuery: Record<string, string | string[]> = {};
    
    // For each query parameter, use the last value if there are duplicates
    Object.keys(req.query).forEach((key) => {
      const value = req.query[key];
      if (Array.isArray(value)) {
        cleanQuery[key] = value[value.length - 1];
      } else {
        cleanQuery[key] = value;
      }
    });
    
    req.query = cleanQuery;
  }
  
  next();
};

/**
 * Validate Content Type
 * Only allow specified content types for requests with bodies
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only check requests with bodies
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.headers['content-type'] || '';
      
      // Check if content type matches any of the allowed types
      const isAllowed = allowedTypes.some(type => contentType.includes(type));
      
      if (!isAllowed) {
        return res.status(415).json({
          status: 'error',
          message: `Unsupported Content-Type. Must be one of: ${allowedTypes.join(', ')}`
        });
      }
    }
    
    next();
  };
};

/**
 * Prevent Open Redirect
 * Validates that redirects only go to allowed domains
 */
export const preventOpenRedirect = (allowedDomains: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original redirect method
    const originalRedirect = res.redirect;
    
    // Override redirect method
    res.redirect = function(url: string): void {
      // Parse the URL
      try {
        const parsedUrl = new URL(url, `http://${req.headers.host}`);
        const hostname = parsedUrl.hostname;
        
        // Check if URL is relative (no hostname) or hostname is allowed
        const isAllowed = !hostname || 
                        hostname === req.headers.host || 
                        allowedDomains.some(domain => hostname.endsWith(domain));
        
        if (!isAllowed) {
          console.warn(`Prevented redirect to disallowed domain: ${hostname}`);
          originalRedirect.call(this, '/');
          return;
        }
      } catch (error) {
        // If URL parsing fails, assume it's a relative path which is safe
      }
      
      // Call original redirect with validated URL
      originalRedirect.call(this, url);
    } as any;
    
    next();
  };
};

/**
 * Combined security middleware bundle
 * Applies all security middleware at once
 */
export const applySecurity = (app: any) => {
  // Apply security headers
  app.use(securityHeaders);
  
  // Apply rate limiting
  app.use(standardRateLimiter);
  
  // Prevent parameter pollution
  app.use(preventParameterPollution);
  
  // Validate content type
  app.use(validateContentType(['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data']));
  
  // Prevent open redirect - add your domains here
  app.use(preventOpenRedirect(['.yourdomain.com']));
  
  // Log security info
  console.log('🔒 Security middleware applied');
};