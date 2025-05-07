import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { getServiceURL } from './serviceRegistry';

/**
 * Creates a proxy middleware for a specific service
 * 
 * @param {string} serviceName - Name of the service to route to
 * @param {string} pathRewrite - Path prefix to remove when forwarding request
 * @returns {Function} Proxy middleware
 */
export const createServiceProxy = (
  serviceName: string, 
  pathRewrite: string = '/'
): any => {
  // Create proxy configuration
  const proxyOptions: Options = {
    target: getServiceURL(serviceName),
    changeOrigin: true,
    // Convert to safe object format for http-proxy-middleware
    pathRewrite: {
      [`^${pathRewrite}`]: '/api',
    },
    // Handle target resolution per-request to support dynamic service discovery
    router: function(req: Request) {
      return getServiceURL(serviceName);
    },
    // Add custom headers for service-to-service communication
    onProxyReq: (proxyReq, req: Request, res) => {
      // Attach user information from JWT if authenticated
      if ((req as any).user) {
        proxyReq.setHeader('X-User-ID', (req as any).user.userId);
        proxyReq.setHeader('X-User-Role', (req as any).user.role);
      }
      
      // Add gateway tracking header
      proxyReq.setHeader('X-Forwarded-By', 'API-Gateway');
      
      // Add request timestamp for latency tracking
      proxyReq.setHeader('X-Request-Time', Date.now().toString());
    },
    // Override default timeout to be longer for slow operations
    proxyTimeout: 30000,
    // Apply custom timeout for each request based on the endpoint
    timeout: function(req: Request) {
      // Use longer timeout for batch operations
      if (req.path.includes('batch') || req.path.includes('import')) {
        return 120000; // 2 minutes
      }
      return 30000; // 30 seconds
    },
    // Handle proxy errors
    onError: (err, req, res) => {
      console.error(`[${serviceName}Proxy] Error:`, err);
      
      res.status(502).json({
        status: 'error',
        message: `${serviceName} service is currently unavailable`,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  };
  
  return createProxyMiddleware(proxyOptions);
};

/**
 * Middleware to log requests before they are proxied
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request info
  console.log(`[API Gateway] ${req.method} ${req.url}`);
  
  // Capture response
  const originalEnd = res.end;
  res.end = function(chunk: any, ...rest: any[]) {
    // Calculate request duration
    const duration = Date.now() - startTime;
    
    // Log response info
    console.log(`[API Gateway] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    
    // Call the original end method
    return originalEnd.call(this, chunk, ...rest);
  };
  
  next();
};