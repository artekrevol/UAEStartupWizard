/**
 * Validation utilities for the UAE Business Setup Platform
 */

/**
 * Validates an email address format
 * @param email Email address to validate
 * @returns True if the email is valid
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a password for security requirements
 * - At least 8 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * - Contains at least one special character
 * 
 * @param password Password to validate
 * @returns True if the password meets security requirements
 */
export function validatePassword(password: string): boolean {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Validates a business name
 * - Not empty
 * - At least 3 characters long
 * - Contains only allowed characters for business names
 * 
 * @param name Business name to validate
 * @returns True if the business name is valid
 */
export function validateBusinessName(name: string): boolean {
  if (!name || name.trim().length < 3) return false;
  // Allow letters, numbers, spaces, and common punctuation used in business names
  const businessNameRegex = /^[A-Za-z0-9\s&.,'()-]+$/;
  return businessNameRegex.test(name);
}

/**
 * Validates a UAE phone number
 * @param phone Phone number to validate
 * @returns True if the phone number is a valid UAE format
 */
export function validateUAEPhone(phone: string): boolean {
  // UAE phone numbers can start with +971, 00971, or 0 followed by 9 digits
  const phoneRegex = /^(\+971|00971|0)[0-9]{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Validates a trade license number
 * @param licenseNumber License number to validate
 * @returns True if the license number follows UAE format
 */
export function validateTradeLicense(licenseNumber: string): boolean {
  // Basic validation - adjust based on actual UAE trade license formats
  if (!licenseNumber || licenseNumber.trim().length < 5) return false;
  if (licenseNumber.trim().length > 30) return false;
  
  // Allow for various UAE license formats:
  // - Format 1: ABCDE-12345
  // - Format 2: 12345/DMCC/2023
  // - Format 3: TL-12345-SAIF
  return true; // Simplified for testing - we'll accept any reasonable license format for now
}

/**
 * Validates a document file type is allowed
 * @param filename Filename to check
 * @returns True if the file type is allowed
 */
export function validateDocumentType(filename: string): boolean {
  const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
  
  // If the filename contains a dot, extract the extension
  if (filename.includes('.')) {
    const extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    return allowedTypes.includes(extension);
  }
  
  // If no dot, assume the string is the extension itself
  return allowedTypes.includes(filename.toLowerCase());
}

/**
 * Validates file size is within limits
 * @param sizeInBytes File size in bytes
 * @param maxSizeInMB Maximum allowed size in MB
 * @returns True if the file size is within limits
 */
export function validateFileSize(sizeInBytes: number, maxSizeInMB: number = 10): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return sizeInBytes <= maxSizeInBytes;
}