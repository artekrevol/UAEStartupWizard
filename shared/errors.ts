/**
 * Shared Error Handling Library for Microservices
 * 
 * This module provides standardized error handling across all microservices.
 */
import { Request, Response, NextFunction } from 'express';

export enum ErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  
  // Document errors
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  INVALID_DOCUMENT = 'INVALID_DOCUMENT',
  DOCUMENT_UPLOAD_FAILED = 'DOCUMENT_UPLOAD_FAILED',
  
  // Free zone errors
  FREEZONE_NOT_FOUND = 'FREEZONE_NOT_FOUND',
  BUSINESS_ACTIVITY_NOT_FOUND = 'BUSINESS_ACTIVITY_NOT_FOUND',
  
  // AI/Research errors
  RESEARCH_FAILED = 'RESEARCH_FAILED',
  OPENAI_ERROR = 'OPENAI_ERROR',
  
  // Scraper errors
  SCRAPER_ERROR = 'SCRAPER_ERROR',
  SCRAPER_TIMEOUT = 'SCRAPER_TIMEOUT'
}

/**
 * StandardError for consistent error structure across services
 */
export class ServiceException extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: any;
  
  constructor(code: ErrorCode, message: string, details?: any) {
    super(message);
    this.name = 'ServiceException';
    this.code = code;
    this.details = details;
    
    // Map error codes to HTTP status codes
    this.statusCode = this.getStatusCodeFromErrorCode(code);
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
  
  private getStatusCodeFromErrorCode(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.VALIDATION_ERROR:
        return 400; // Bad Request
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.INVALID_CREDENTIALS:
      case ErrorCode.TOKEN_EXPIRED:
      case ErrorCode.INVALID_TOKEN:
        return 401; // Unauthorized
      case ErrorCode.FORBIDDEN:
        return 403; // Forbidden
      case ErrorCode.NOT_FOUND:
      case ErrorCode.USER_NOT_FOUND:
      case ErrorCode.DOCUMENT_NOT_FOUND:
      case ErrorCode.FREEZONE_NOT_FOUND:
      case ErrorCode.BUSINESS_ACTIVITY_NOT_FOUND:
        return 404; // Not Found
      case ErrorCode.USER_ALREADY_EXISTS:
        return 409; // Conflict
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 429; // Too Many Requests
      case ErrorCode.SERVICE_UNAVAILABLE:
      case ErrorCode.OPENAI_ERROR:
      case ErrorCode.SCRAPER_TIMEOUT:
        return 503; // Service Unavailable
      default:
        return 500; // Internal Server Error
    }
  }
}

/**
 * Global error handler middleware
 */
export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[ERROR] ${err.message}`, err.stack);
  
  if (err instanceof ServiceException) {
    // Handle known service exceptions
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      details: err.details
    });
  } else if (err.type === 'entity.too.large') {
    // Handle file size errors from Express
    return res.status(413).json({
      code: 'ENTITY_TOO_LARGE',
      message: 'The file is too large. Maximum file size allowed is 10MB.',
    });
  } else if (err.name === 'ValidationError' || err.name === 'ZodError') {
    // Handle validation errors (e.g., from Zod)
    return res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation error',
      details: err.errors || err.issues
    });
  } else if (err.name === 'JsonWebTokenError') {
    // Handle JWT errors
    return res.status(401).json({
      code: ErrorCode.INVALID_TOKEN,
      message: 'Invalid token',
    });
  } else if (err.name === 'TokenExpiredError') {
    // Handle JWT expiration
    return res.status(401).json({
      code: ErrorCode.TOKEN_EXPIRED,
      message: 'Token expired',
    });
  }
  
  // Handle unknown errors
  return res.status(500).json({
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
    requestId: req.headers['x-request-id'] || undefined
  });
}
