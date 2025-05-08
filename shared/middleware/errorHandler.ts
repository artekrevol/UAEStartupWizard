/**
 * Error Handler Middleware
 * Provides consistent error handling for all microservices
 */
import { Request, Response, NextFunction } from 'express';
import { ServiceException, ErrorCode } from '../errors';
import { logger } from '../logger';

/**
 * Middleware to handle errors consistently across all services
 */
export const errorHandler = (
  err: Error | ServiceException,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If headers already sent, let Express handle it
  if (res.headersSent) {
    return next(err);
  }

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    error: {
      code: ErrorCode.UNKNOWN_ERROR,
      message: 'An unexpected error occurred'
    }
  };

  // Handle ServiceException with proper error format
  if (err instanceof ServiceException) {
    statusCode = err.statusCode;
    errorResponse = err.toJSON();
    
    // Log error details based on severity
    if (statusCode >= 500) {
      logger.error(`[ServiceError] ${err.message}`, {
        code: err.code,
        path: req.path,
        method: req.method,
        details: err.details
      });
    } else if (statusCode >= 400) {
      logger.warn(`[ClientError] ${err.message}`, {
        code: err.code,
        path: req.path,
        method: req.method
      });
    }
  } else {
    // For unhandled errors, log with stack trace
    logger.error(`[UnhandledError] ${err.message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method
    });
    
    // In production, don't expose internal error details
    if (process.env.NODE_ENV === 'production') {
      errorResponse.error.message = 'An internal server error occurred';
    } else {
      // In development, include more details
      errorResponse.error.message = err.message;
      (errorResponse.error as any).stack = err.stack;
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async request handler wrapper to automatically catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};