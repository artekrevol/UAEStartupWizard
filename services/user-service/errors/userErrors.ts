/**
 * User Service Error Definitions
 * 
 * Defines specific error codes and messages for the User Service
 */
import { ApiError } from '../../../shared/errors/ApiError';

export enum UserErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'auth/invalid-credentials',
  ACCOUNT_LOCKED = 'auth/account-locked',
  ACCOUNT_SUSPENDED = 'auth/account-suspended',
  ACCOUNT_INACTIVE = 'auth/account-inactive',
  UNVERIFIED_ACCOUNT = 'auth/unverified-account',
  INVALID_TOKEN = 'auth/invalid-token',
  TOKEN_EXPIRED = 'auth/token-expired',
  SESSION_EXPIRED = 'auth/session-expired',
  
  // Registration errors
  USERNAME_ALREADY_EXISTS = 'registration/username-exists',
  EMAIL_ALREADY_EXISTS = 'registration/email-exists',
  INVALID_USERNAME = 'registration/invalid-username',
  INVALID_EMAIL = 'registration/invalid-email',
  WEAK_PASSWORD = 'registration/weak-password',
  
  // Password errors
  PASSWORD_RESET_EXPIRED = 'password/reset-expired',
  PASSWORD_RESET_INVALID = 'password/reset-invalid',
  PASSWORD_MISMATCH = 'password/mismatch',
  PASSWORD_SAME_AS_OLD = 'password/same-as-old',
  
  // User management errors
  USER_NOT_FOUND = 'user/not-found',
  PROFILE_NOT_FOUND = 'user/profile-not-found',
  NOTIFICATION_NOT_FOUND = 'user/notification-not-found',
  SESSION_NOT_FOUND = 'user/session-not-found',
  
  // Permission errors
  INSUFFICIENT_PERMISSIONS = 'permission/insufficient',
  SELF_MODIFICATION_FORBIDDEN = 'permission/self-modification-forbidden',
  ROLE_CHANGE_FORBIDDEN = 'permission/role-change-forbidden',
  
  // Rate limiting
  TOO_MANY_REQUESTS = 'rate-limit/too-many-requests',
  TOO_MANY_LOGIN_ATTEMPTS = 'rate-limit/too-many-login-attempts',
  
  // Validation errors
  INVALID_INPUT = 'validation/invalid-input',
  MISSING_REQUIRED_FIELDS = 'validation/missing-fields',
  
  // System errors
  DATABASE_ERROR = 'system/database-error',
  INTERNAL_ERROR = 'system/internal-error',
}

/**
 * Create a standard API error for user service
 * @param code Error code
 * @param message Custom message (optional)
 * @param status HTTP status code (optional)
 * @returns ApiError instance
 */
export function createUserError(
  code: UserErrorCode, 
  message?: string,
  status?: number
): ApiError {
  // Define default messages and status codes for error types
  let defaultMessage: string;
  let defaultStatus: number;
  
  switch (code) {
    // Authentication errors
    case UserErrorCode.INVALID_CREDENTIALS:
      defaultMessage = 'Invalid username or password';
      defaultStatus = 401;
      break;
    case UserErrorCode.ACCOUNT_LOCKED:
      defaultMessage = 'Account is temporarily locked due to too many failed login attempts';
      defaultStatus = 403;
      break;
    case UserErrorCode.ACCOUNT_SUSPENDED:
      defaultMessage = 'Account has been suspended';
      defaultStatus = 403;
      break;
    case UserErrorCode.ACCOUNT_INACTIVE:
      defaultMessage = 'Account is inactive';
      defaultStatus = 403;
      break;
    case UserErrorCode.UNVERIFIED_ACCOUNT:
      defaultMessage = 'Account email has not been verified';
      defaultStatus = 403;
      break;
    case UserErrorCode.INVALID_TOKEN:
      defaultMessage = 'Invalid authentication token';
      defaultStatus = 401;
      break;
    case UserErrorCode.TOKEN_EXPIRED:
      defaultMessage = 'Authentication token has expired';
      defaultStatus = 401;
      break;
    case UserErrorCode.SESSION_EXPIRED:
      defaultMessage = 'Your session has expired, please login again';
      defaultStatus = 401;
      break;
      
    // Registration errors
    case UserErrorCode.USERNAME_ALREADY_EXISTS:
      defaultMessage = 'Username is already taken';
      defaultStatus = 409;
      break;
    case UserErrorCode.EMAIL_ALREADY_EXISTS:
      defaultMessage = 'Email is already registered';
      defaultStatus = 409;
      break;
    case UserErrorCode.INVALID_USERNAME:
      defaultMessage = 'Username format is invalid';
      defaultStatus = 400;
      break;
    case UserErrorCode.INVALID_EMAIL:
      defaultMessage = 'Email format is invalid';
      defaultStatus = 400;
      break;
    case UserErrorCode.WEAK_PASSWORD:
      defaultMessage = 'Password does not meet security requirements';
      defaultStatus = 400;
      break;
      
    // Password errors
    case UserErrorCode.PASSWORD_RESET_EXPIRED:
      defaultMessage = 'Password reset link has expired';
      defaultStatus = 400;
      break;
    case UserErrorCode.PASSWORD_RESET_INVALID:
      defaultMessage = 'Invalid password reset token';
      defaultStatus = 400;
      break;
    case UserErrorCode.PASSWORD_MISMATCH:
      defaultMessage = 'Passwords do not match';
      defaultStatus = 400;
      break;
    case UserErrorCode.PASSWORD_SAME_AS_OLD:
      defaultMessage = 'New password must be different from current password';
      defaultStatus = 400;
      break;
      
    // User management errors
    case UserErrorCode.USER_NOT_FOUND:
      defaultMessage = 'User not found';
      defaultStatus = 404;
      break;
    case UserErrorCode.PROFILE_NOT_FOUND:
      defaultMessage = 'User profile not found';
      defaultStatus = 404;
      break;
    case UserErrorCode.NOTIFICATION_NOT_FOUND:
      defaultMessage = 'Notification not found';
      defaultStatus = 404;
      break;
    case UserErrorCode.SESSION_NOT_FOUND:
      defaultMessage = 'Session not found';
      defaultStatus = 404;
      break;
      
    // Permission errors
    case UserErrorCode.INSUFFICIENT_PERMISSIONS:
      defaultMessage = 'You do not have permission to perform this action';
      defaultStatus = 403;
      break;
    case UserErrorCode.SELF_MODIFICATION_FORBIDDEN:
      defaultMessage = 'You cannot perform this action on your own account';
      defaultStatus = 403;
      break;
    case UserErrorCode.ROLE_CHANGE_FORBIDDEN:
      defaultMessage = 'You cannot change to this role';
      defaultStatus = 403;
      break;
      
    // Rate limiting
    case UserErrorCode.TOO_MANY_REQUESTS:
      defaultMessage = 'Too many requests, please try again later';
      defaultStatus = 429;
      break;
    case UserErrorCode.TOO_MANY_LOGIN_ATTEMPTS:
      defaultMessage = 'Too many login attempts, account temporarily locked';
      defaultStatus = 429;
      break;
      
    // Validation errors
    case UserErrorCode.INVALID_INPUT:
      defaultMessage = 'Invalid input data';
      defaultStatus = 400;
      break;
    case UserErrorCode.MISSING_REQUIRED_FIELDS:
      defaultMessage = 'Missing required fields';
      defaultStatus = 400;
      break;
      
    // System errors
    case UserErrorCode.DATABASE_ERROR:
      defaultMessage = 'Database operation failed';
      defaultStatus = 500;
      break;
    case UserErrorCode.INTERNAL_ERROR:
      defaultMessage = 'Internal server error';
      defaultStatus = 500;
      break;
      
    default:
      defaultMessage = 'An unknown error occurred';
      defaultStatus = 500;
  }
  
  return new ApiError(
    message || defaultMessage,
    code,
    status || defaultStatus
  );
}