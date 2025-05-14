/**
 * Service Authentication Middleware
 * 
 * Handles secure communication between microservices using API keys
 * Each service has its own unique API key that must be provided when making requests to other services
 */
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { ApiError } from '../errors/ApiError';

// List of registered services and their API keys
// In production, these should be stored in a secure environment variable
const serviceApiKeys: Record<string, string> = {
  'api-gateway': config.security.serviceApiKeys?.['api-gateway'] || 'dev_api_gateway_key',
  'user-service': config.security.serviceApiKeys?.['user-service'] || 'dev_user_service_key',
  'document-service': config.security.serviceApiKeys?.['document-service'] || 'dev_document_service_key',
  'freezone-service': config.security.serviceApiKeys?.['freezone-service'] || 'dev_freezone_service_key',
  'ai-service': config.security.serviceApiKeys?.['ai-service'] || 'dev_ai_service_key',
  'scraper-service': config.security.serviceApiKeys?.['scraper-service'] || 'dev_scraper_service_key',
};

/**
 * Authenticate service-to-service requests
 * Requires a valid API key and service name in the headers
 */
export const authenticateService = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const serviceName = req.headers['x-service-name'] as string;
  
  if (!apiKey || !serviceName) {
    return next(new ApiError('Service authentication failed: Missing credentials', 'SERVICE_AUTH_FAILED', 401));
  }
  
  // Verify the service exists and the API key is correct
  if (!serviceApiKeys[serviceName] || serviceApiKeys[serviceName] !== apiKey) {
    return next(new ApiError('Service authentication failed: Invalid credentials', 'SERVICE_AUTH_FAILED', 401));
  }
  
  // Attach service info to request
  req.service = {
    name: serviceName
  };
  
  next();
};

/**
 * Helper function to get the API key for a specific service
 * Used when making requests to other services
 */
export const getServiceApiKey = (serviceName: string): string => {
  return serviceApiKeys[serviceName] || '';
};

// Extend Express Request type to include service information
declare global {
  namespace Express {
    interface Request {
      service?: {
        name: string;
      };
    }
  }
}