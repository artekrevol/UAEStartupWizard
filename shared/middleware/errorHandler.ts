import { NextFunction, Request, Response } from 'express';
import { ServiceException, ErrorCode } from '../errors';

/**
 * Map error codes to HTTP status codes
 */
const ERROR_CODE_TO_STATUS = {
  // Client errors - 4xx
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
  
  // Server errors - 5xx
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
};

/**
 * Centralized error handling middleware
 * Formats and returns consistent error responses
 */
export const errorHandler = (
  err: Error | ServiceException,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isServiceError = err instanceof ServiceException;
  
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = ErrorCode.INTERNAL_ERROR;
  let errorDetails = null;
  
  // Handle service errors (expected errors)
  if (isServiceError) {
    const serviceError = err as ServiceException;
    errorCode = serviceError.code;
    statusCode = ERROR_CODE_TO_STATUS[errorCode] || 500;
    message = serviceError.message;
    errorDetails = serviceError.details;
  } else {
    // Log unexpected errors for monitoring
    console.error('Unexpected error:', err);
  }
  
  // Development vs Production error response
  const isDev = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    status: 'error',
    code: errorCode,
    message,
    ...(isDev && { stack: err.stack }),
    ...(errorDetails && { details: errorDetails })
  };
  
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware for handling 404 Not Found errors
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

/**
 * Async route handler wrapper to avoid try/catch blocks in routes
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};