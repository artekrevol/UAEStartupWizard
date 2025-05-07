/**
 * Error handling utilities for the application
 */

// Error codes for specific errors
export enum ErrorCode {
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',
  
  // User-related errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Document-related errors
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_ALREADY_EXISTS = 'DOCUMENT_ALREADY_EXISTS',
  DOCUMENT_UPLOAD_FAILED = 'DOCUMENT_UPLOAD_FAILED',
  
  // Freezone-related errors
  FREEZONE_NOT_FOUND = 'FREEZONE_NOT_FOUND',
  FREEZONE_ALREADY_EXISTS = 'FREEZONE_ALREADY_EXISTS',
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  ACTIVITY_NOT_FOUND = 'ACTIVITY_NOT_FOUND',
  
  // API-related errors
  API_RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  
  // File-related errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  
  // Data enrichment errors
  ENRICHMENT_FAILED = 'ENRICHMENT_FAILED',
  SCRAPER_ERROR = 'SCRAPER_ERROR'
}

// Base exception class
export class ServiceException extends Error {
  public code: ErrorCode;
  public details?: any;
  public status: number;
  
  constructor(code: ErrorCode, message: string, details?: any, status: number = 500) {
    super(message);
    this.name = 'ServiceException';
    this.code = code;
    this.details = details;
    this.status = status;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ServiceException.prototype);
  }
}

// Database-specific exception
export class DatabaseException extends ServiceException {
  constructor(message: string, details?: any) {
    super(ErrorCode.DATABASE_ERROR, message, details, 500);
    this.name = 'DatabaseException';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, DatabaseException.prototype);
  }
}

// Validation exception
export class ValidationException extends ServiceException {
  constructor(message: string, details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, details, 400);
    this.name = 'ValidationException';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}

// Not found exception
export class NotFoundException extends ServiceException {
  constructor(resourceType: string, resourceId: number | string) {
    super(
      ErrorCode.NOT_FOUND,
      `${resourceType} with ID ${resourceId} not found`,
      { resourceType, resourceId },
      404
    );
    this.name = 'NotFoundException';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, NotFoundException.prototype);
  }
}

// Authentication exception
export class AuthenticationException extends ServiceException {
  constructor(message: string, details?: any) {
    super(ErrorCode.UNAUTHORIZED, message, details, 401);
    this.name = 'AuthenticationException';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AuthenticationException.prototype);
  }
}

// Authorization exception
export class AuthorizationException extends ServiceException {
  constructor(message: string, details?: any) {
    super(ErrorCode.FORBIDDEN, message, details, 403);
    this.name = 'AuthorizationException';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AuthorizationException.prototype);
  }
}

// Rate limit exception
export class RateLimitException extends ServiceException {
  constructor(message: string, details?: any) {
    super(ErrorCode.API_RATE_LIMIT_EXCEEDED, message, details, 429);
    this.name = 'RateLimitException';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, RateLimitException.prototype);
  }
}

// External service exception
export class ExternalServiceException extends ServiceException {
  constructor(message: string, details?: any) {
    super(ErrorCode.EXTERNAL_SERVICE_ERROR, message, details, 502);
    this.name = 'ExternalServiceException';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ExternalServiceException.prototype);
  }
}

// AI service exception
export class AIServiceException extends ServiceException {
  constructor(message: string, details?: any) {
    super(ErrorCode.AI_SERVICE_ERROR, message, details, 502);
    this.name = 'AIServiceException';
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AIServiceException.prototype);
  }
}