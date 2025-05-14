/**
 * Middleware for capturing user interactions from API requests
 * 
 * This middleware automatically logs certain types of interactions
 * based on API requests, providing passive data collection capabilities.
 */

import { Request, Response, NextFunction } from 'express';
import { recordUserInteraction } from '../services/userInteractionService';
import { InsertUserInteraction } from '@shared/schema';

/**
 * Middleware that captures API interactions
 */
export function captureApiInteractions(req: Request, res: Response, next: NextFunction) {
  // Skip tracking for certain routes
  const skipRoutes = [
    '/api/user-interactions',
    '/api/health', 
    '/api/status',
    '/api/heartbeat',
    '/ws', // WebSocket route
  ];
  
  if (skipRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  
  // Get the original end function
  const originalEnd = res.end;
  
  // The timestamp when the request started
  const requestStartTime = Date.now();
  
  // Override the end function
  res.end = function(this: Response, ...args: any[]) {
    // Calculate request duration
    const duration = Date.now() - requestStartTime;
    
    // Only track successful API requests (status codes 2xx and 3xx)
    if (res.statusCode >= 200 && res.statusCode < 400 && req.path.startsWith('/api/')) {
      const userId = req.user?.id;
      const username = req.user?.username || null;
      
      // Extract relevant request information
      const interaction: InsertUserInteraction = {
        userId: userId || null,
        username: username,
        sessionId: req.sessionID || null,
        interactionType: 'api_request',
        pageUrl: null,
        component: null,
        elementId: null,
        elementText: null,
        interactionValue: req.method,
        metadata: {
          path: req.path,
          method: req.method,
          query: req.query,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent'],
          referer: req.headers.referer,
        },
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        deviceType: determineDeviceType(req.headers['user-agent'] || ''),
        duration,
        success: res.statusCode < 400,
      };
      
      // Asynchronously record the interaction without affecting the response
      recordUserInteraction(interaction).catch(err => {
        console.error('Failed to record API interaction:', err);
      });
    }
    
    // Call the original end function
    return originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Simple function to determine device type from user agent
 */
function determineDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
    return 'mobile';
  } else if (ua.includes('tablet')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}