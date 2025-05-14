/**
 * Shared Error Handler Middleware
 * 
 * Centralized error handling for all microservices
 */
import { Request, Response, NextFunction } from 'express';
import { ServiceException, ErrorCode } from '../errors';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`Error processing ${req.method} ${req.path}:`, err);
  
  // Handle ServiceException (known errors)
  if (err instanceof ServiceException) {
    const statusCode = getStatusCodeFromErrorCode(err.code);
    
    return res.status(statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      code: ErrorCode.INVALID_TOKEN,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      code: ErrorCode.TOKEN_EXPIRED,
      message: 'Token has expired'
    });
  }
  
  // Handle other errors
  res.status(500).json({
    code: ErrorCode.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    // Include stack trace in development, not in production
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {})
  });
}

/**
 * Map error codes to HTTP status codes
 */
function getStatusCodeFromErrorCode(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    [ErrorCode.INVALID_INPUT]: 400,
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.INVALID_TOKEN]: 401,
    [ErrorCode.TOKEN_EXPIRED]: 401,
    [ErrorCode.INVALID_CREDENTIALS]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.USER_NOT_FOUND]: 404,
    [ErrorCode.DOCUMENT_NOT_FOUND]: 404,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.USER_ALREADY_EXISTS]: 409,
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503
  };
  
  return statusMap[code] || 500;
}
