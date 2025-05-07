import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { getServiceRegistry, getServiceForPath } from '../config/serviceRegistry';
import { ServiceException, ErrorCode } from '../../../shared/errors';

/**
 * Create a proxy middleware that routes requests to the appropriate service
 * @returns Proxy middleware function
 */
export const createServiceProxy = () => {
  // Get service registry
  const serviceRegistry = getServiceRegistry();
  
  // Options for the proxy middleware
  const options: Options = {
    target: 'http://localhost:3000', // Default target, will be overridden
    changeOrigin: true,
    pathRewrite: {
      '^/api': '', // Remove /api prefix when forwarding to services
    },
    router: (req: Request) => {
      // Extract the path from the URL
      const path = req.url.replace(/^\/api/, '');
      
      // Determine the target service
      const serviceName = getServiceForPath(path);
      
      if (!serviceName || !serviceRegistry[serviceName]) {
        throw new ServiceException(
          ErrorCode.NOT_FOUND,
          `No service found for path: ${path}`,
          undefined,
          404
        );
      }
      
      // Return the URL for the target service
      return serviceRegistry[serviceName].url;
    },
    proxyTimeout: 120000, // 2 minutes default timeout
    timeout: (req: Request) => {
      // Get the path
      const path = req.url.replace(/^\/api/, '');
      
      // Determine the target service
      const serviceName = getServiceForPath(path);
      
      if (!serviceName || !serviceRegistry[serviceName]) {
        return 5000; // Default timeout
      }
      
      // Return the timeout for the target service
      return serviceRegistry[serviceName].timeout;
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add X-Forwarded headers
      proxyReq.setHeader('X-Forwarded-For', req.ip);
      proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
      proxyReq.setHeader('X-Forwarded-Host', req.hostname);
      
      // If there's a user in the request, add it to headers for the target service
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.userId.toString());
        proxyReq.setHeader('X-User-Role', req.user.role);
        proxyReq.setHeader('X-User-Email', req.user.email);
      }
    },
    onError: (err, req, res) => {
      // Handle proxy errors
      console.error(`[API Gateway] Proxy error: ${err.message}`);
      
      // Send an appropriate error response
      if (!res.headersSent) {
        if (err.code === 'ECONNREFUSED') {
          res.status(503).json({
            status: 'error',
            code: ErrorCode.API_UNAVAILABLE,
            message: 'Service is currently unavailable. Please try again later.'
          });
        } else if (err.code === 'ETIMEDOUT') {
          res.status(504).json({
            status: 'error',
            code: ErrorCode.API_UNAVAILABLE,
            message: 'Request timed out. Please try again later.'
          });
        } else {
          res.status(500).json({
            status: 'error',
            code: ErrorCode.UNKNOWN_ERROR,
            message: 'An error occurred while processing your request.'
          });
        }
      }
    }
  };
  
  // Create and return the proxy middleware
  return createProxyMiddleware(options);
};

/**
 * Check if all services are healthy
 * @returns Promise resolving to a map of service names to health status
 */
export const checkServiceHealth = async (): Promise<{ [service: string]: boolean }> => {
  const serviceRegistry = getServiceRegistry();
  const healthStatus: { [service: string]: boolean } = {};
  
  await Promise.all(
    Object.entries(serviceRegistry).map(async ([serviceName, config]) => {
      try {
        const response = await fetch(`${config.url}${config.healthEndpoint}`);
        healthStatus[serviceName] = response.ok;
      } catch (error) {
        console.error(`[API Gateway] Health check failed for ${serviceName}: ${error.message}`);
        healthStatus[serviceName] = false;
      }
    })
  );
  
  return healthStatus;
};