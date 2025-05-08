/**
 * Error Handler Middleware
 * 
 * Provides centralized error handling for the application
 */
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/ApiError';

/**
 * Handle 404 Not Found errors
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError('Resource not found', 'NOT_FOUND', 404);
  next(error);
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: 'VALIDATION_ERROR',
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

  // Database errors
  if (err.name === 'SequelizeError' || err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      success: false,
      error: {
        message: 'Database error',
        code: 'DATABASE_ERROR',
      },
    });
  }

  // Default to 500 Internal Server Error for unhandled exceptions
  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message || 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
};