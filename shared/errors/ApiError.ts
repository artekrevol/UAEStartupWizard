/**
 * ApiError class
 * 
 * Custom error class for API-related errors
 * Provides consistent error handling across all services
 */
export type ErrorCode = string;

export class ApiError extends Error {
  statusCode: number;
  errorCode?: ErrorCode;
  details?: any;
  
  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: ErrorCode,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    
    // Ensures proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Common status code errors
export const BadRequestError = (message: string, errorCode?: ErrorCode, details?: any) => 
  new ApiError(message, 400, errorCode, details);

export const UnauthorizedError = (message: string, errorCode?: ErrorCode, details?: any) => 
  new ApiError(message, 401, errorCode, details);

export const ForbiddenError = (message: string, errorCode?: ErrorCode, details?: any) => 
  new ApiError(message, 403, errorCode, details);

export const NotFoundError = (message: string, errorCode?: ErrorCode, details?: any) => 
  new ApiError(message, 404, errorCode, details);

export const MethodNotAllowedError = (message: string, errorCode?: ErrorCode, details?: any) => 
  new ApiError(message, 405, errorCode, details);

export const ConflictError = (message: string, errorCode?: ErrorCode, details?: any) => 
  new ApiError(message, 409, errorCode, details);

export const UnprocessableEntityError = (message: string, errorCode?: ErrorCode, details?: any) => 
  new ApiError(message, 422, errorCode, details);

export const TooManyRequestsError = (message: string, errorCode?: ErrorCode, details?: any) => 
  new ApiError(message, 429, errorCode, details);

export const InternalServerError = (message: string, errorCode?: ErrorCode, details?: any) => 
  new ApiError(message, 500, errorCode, details);

export const ServiceUnavailableError = (message: string, errorCode?: ErrorCode, details?: any) => 
  new ApiError(message, 503, errorCode, details);