import { Request, Response, NextFunction } from 'express';
import { 
  ServiceException, 
  ErrorCode, 
  ValidationException, 
  DatabaseException, 
  AuthenticationException,
  AuthorizationException,
  RateLimitException,
  ExternalServiceException
} from '../errors';

/**
 * Async handler to catch errors in async route handlers
 * @param fn The route handler function
 * @returns A function that handles errors in async route handlers
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Error] ${err.message}`, err);
  
  // Handle ServiceException
  if (err instanceof ServiceException) {
    return res.status(err.status).json({
      status: 'error',
      code: err.code,
      message: err.message,
      details: err.details
    });
  }
  
  // Handle 404 errors
  if (err.message === 'Not Found') {
    return res.status(404).json({
      status: 'error',
      code: ErrorCode.NOT_FOUND,
      message: 'Resource not found'
    });
  }
  
  // Handle validation errors from express-validator
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation error',
      details: err
    });
  }
  
  // Handle unexpected errors
  return res.status(500).json({
    status: 'error',
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

/**
 * 404 handler middleware
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: 'error',
    code: ErrorCode.NOT_FOUND,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};