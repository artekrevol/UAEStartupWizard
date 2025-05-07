/**
 * Shared Error Types and Handling
 * 
 * Provides standardized error types and handling across microservices
 */

/**
 * Error codes used throughout the application
 */
export enum ErrorCode {
  // Client errors - 4xx
  INVALID_INPUT = 'INVALID_INPUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors - 5xx
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

/**
 * Custom exception class for service-specific errors
 */
export class ServiceException extends Error {
  code: ErrorCode;
  details?: Record<string, any>;
  
  constructor(code: ErrorCode, message: string, details?: Record<string, any>) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'ServiceException';
    
    // Ensure stack trace works in derived classes
    Object.setPrototypeOf(this, ServiceException.prototype);
  }
}

/**
 * Database specific exception
 */
export class DatabaseException extends ServiceException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.DATABASE_ERROR, message, details);
    this.name = 'DatabaseException';
    
    // Ensure stack trace works in derived classes
    Object.setPrototypeOf(this, DatabaseException.prototype);
  }
}

/**
 * Validation exception for input validation errors
 */
export class ValidationException extends ServiceException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
    this.name = 'ValidationException';
    
    // Ensure stack trace works in derived classes
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}

/**
 * Resource not found exception
 */
export class NotFoundException extends ServiceException {
  constructor(resourceType: string, id: string | number) {
    super(
      ErrorCode.NOT_FOUND, 
      `${resourceType} with ID ${id} not found`
    );
    this.name = 'NotFoundException';
    
    // Ensure stack trace works in derived classes
    Object.setPrototypeOf(this, NotFoundException.prototype);
  }
}

/**
 * Exception for unauthorized access
 */
export class UnauthorizedException extends ServiceException {
  constructor(message: string = 'Unauthorized access') {
    super(ErrorCode.UNAUTHORIZED, message);
    this.name = 'UnauthorizedException';
    
    // Ensure stack trace works in derived classes
    Object.setPrototypeOf(this, UnauthorizedException.prototype);
  }
}

/**
 * Exception for forbidden access (authorized but not allowed)
 */
export class ForbiddenException extends ServiceException {
  constructor(message: string = 'Access forbidden') {
    super(ErrorCode.FORBIDDEN, message);
    this.name = 'ForbiddenException';
    
    // Ensure stack trace works in derived classes
    Object.setPrototypeOf(this, ForbiddenException.prototype);
  }
}
