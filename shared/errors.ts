/**
 * Standardized error handling across microservices
 */
import { ServiceError } from './types';

// Standard error codes
export enum ErrorCode {
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // User service errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_EXISTS = 'USER_EXISTS',
  
  // Document service errors
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  INVALID_DOCUMENT = 'INVALID_DOCUMENT',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  
  // Freezone service errors
  FREEZONE_NOT_FOUND = 'FREEZONE_NOT_FOUND',
  BUSINESS_ACTIVITY_NOT_FOUND = 'BUSINESS_ACTIVITY_NOT_FOUND',
  
  // AI Research service errors
  RESEARCH_FAILED = 'RESEARCH_FAILED',
  OPENAI_ERROR = 'OPENAI_ERROR',
  
  // Scraper service errors
  SCRAPER_FAILED = 'SCRAPER_FAILED',
  INVALID_URL = 'INVALID_URL'
}

// HTTP status codes mapped to error codes
export const errorStatusCodes: Record<ErrorCode, number> = {
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.USER_EXISTS]: 409,
  
  [ErrorCode.DOCUMENT_NOT_FOUND]: 404,
  [ErrorCode.INVALID_DOCUMENT]: 400,
  [ErrorCode.UPLOAD_FAILED]: 500,
  
  [ErrorCode.FREEZONE_NOT_FOUND]: 404,
  [ErrorCode.BUSINESS_ACTIVITY_NOT_FOUND]: 404,
  
  [ErrorCode.RESEARCH_FAILED]: 500,
  [ErrorCode.OPENAI_ERROR]: 503,
  
  [ErrorCode.SCRAPER_FAILED]: 500,
  [ErrorCode.INVALID_URL]: 400
};

// Base service error class
export class ServiceException extends Error {
  code: ErrorCode;
  details?: Record<string, any>;
  statusCode: number;
  
  constructor(code: ErrorCode, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ServiceException';
    this.code = code;
    this.details = details;
    this.statusCode = errorStatusCodes[code] || 500;
  }
  
  toJSON(): ServiceError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

// Error handler middleware for Express
export function errorHandlerMiddleware(err: any, req: any, res: any, next: any): void {
  console.error('Service error:', err);
  
  if (err instanceof ServiceException) {
    res.status(err.statusCode).json(err.toJSON());
    return;
  }
  
  // Handle unexpected errors
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    code: ErrorCode.INTERNAL_ERROR,
    message: err.message || 'An unexpected error occurred',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
