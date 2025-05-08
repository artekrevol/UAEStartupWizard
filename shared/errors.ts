/**
 * Shared Error Types
 * Standardized error handling for all microservices
 */

/**
 * Error codes enum to standardize error reporting
 */
export enum ErrorCode {
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Authentication/authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  API_ERROR = 'API_ERROR',
  
  // Document specific errors
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_PROCESSING_ERROR = 'DOCUMENT_PROCESSING_ERROR',
  DOCUMENT_UPLOAD_ERROR = 'DOCUMENT_UPLOAD_ERROR',
  DOCUMENT_ALREADY_EXISTS = 'DOCUMENT_ALREADY_EXISTS',
  
  // Free zone specific errors
  FREEZONE_NOT_FOUND = 'FREEZONE_NOT_FOUND',
  
  // User specific errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS'
}

/**
 * Base exception for all service errors
 */
export class ServiceException extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  
  constructor(
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    message: string = 'An unexpected error occurred',
    details?: Record<string, any>,
    statusCode: number = 500
  ) {
    super(message);
    this.name = 'ServiceException';
    this.code = code;
    this.statusCode = this.mapCodeToStatusCode(code, statusCode);
    this.details = details;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceException);
    }
  }
  
  /**
   * Map error codes to HTTP status codes
   */
  private mapCodeToStatusCode(code: ErrorCode, defaultStatusCode: number): number {
    switch (code) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.INVALID_TOKEN:
      case ErrorCode.TOKEN_EXPIRED:
        return 401;
      case ErrorCode.FORBIDDEN:
        return 403;
      case ErrorCode.NOT_FOUND:
      case ErrorCode.DOCUMENT_NOT_FOUND:
      case ErrorCode.FREEZONE_NOT_FOUND:
      case ErrorCode.USER_NOT_FOUND:
        return 404;
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_INPUT:
        return 400;
      case ErrorCode.ALREADY_EXISTS:
      case ErrorCode.CONFLICT:
      case ErrorCode.DOCUMENT_ALREADY_EXISTS:
      case ErrorCode.USER_ALREADY_EXISTS:
        return 409;
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 503;
      default:
        return defaultStatusCode;
    }
  }
  
  /**
   * Create a serializable object with error details
   */
  toJSON(): Record<string, any> {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {})
      }
    };
  }
}

/**
 * Specialized error for validation failures
 */
export class ValidationException extends ServiceException {
  constructor(
    message: string = 'Validation error',
    details?: Record<string, any>
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, details, 400);
    this.name = 'ValidationException';
  }
}

/**
 * Specialized error for database issues
 */
export class DatabaseException extends ServiceException {
  constructor(
    message: string = 'Database error',
    details?: Record<string, any>
  ) {
    super(ErrorCode.DATABASE_ERROR, message, details, 500);
    this.name = 'DatabaseException';
  }
}

/**
 * Specialized error for authentication/authorization issues
 */
export class AuthException extends ServiceException {
  constructor(
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    message: string = 'Authentication error',
    details?: Record<string, any>
  ) {
    super(code, message, details, code === ErrorCode.FORBIDDEN ? 403 : 401);
    this.name = 'AuthException';
  }
}

/**
 * Specialized error for resource not found
 */
export class NotFoundException extends ServiceException {
  constructor(
    message: string = 'Resource not found',
    details?: Record<string, any>
  ) {
    super(ErrorCode.NOT_FOUND, message, details, 404);
    this.name = 'NotFoundException';
  }
}