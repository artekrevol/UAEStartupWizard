/**
 * Error Handler Middleware
 * 
 * Provides consistent error handling across all microservices
 */
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/ApiError';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { config } from '../config';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`[ErrorHandler] ${err.message}`, err);

  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.errorCode,
        details: err.details,
      },
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: validationError.details,
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      },
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      },
    });
  }

  // Handle generic errors
  const statusCode = 500;
  const message = config.isProduction
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      stack: config.isProduction ? undefined : err.stack,
    },
  });
};

/**
 * Handle 404 - Not Found errors
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Not found - ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  });
};

/**
 * Async handler to simplify try/catch in controllers
 */
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};