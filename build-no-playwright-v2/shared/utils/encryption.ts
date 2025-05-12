/**
 * Encryption Utils
 * 
 * Provides utilities for encrypting and decrypting sensitive data
 * Used to protect data both at rest and in transit between services
 */
import crypto from 'crypto';
import { config } from '../config';

// Ensure encryption keys are available
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev_encryption_key_32chars_required';
const IV_LENGTH = 16; // For AES, this is always 16 bytes

/**
 * Encrypt sensitive data
 * 
 * @param text Plain text to encrypt
 * @returns Encrypted text (base64 encoded with IV)
 */
export const encrypt = (text: string): string => {
  // Create an initialization vector
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher with key and IV
  const cipher = crypto.createCipheriv(
    'aes-256-cbc', 
    Buffer.from(ENCRYPTION_KEY), 
    iv
  );
  
  // Encrypt the data
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Prepend IV to encrypted data for later decryption
  return `${iv.toString('base64')}:${encrypted}`;
};

/**
 * Decrypt sensitive data
 * 
 * @param text Encrypted text (base64 encoded with IV)
 * @returns Decrypted plain text or null if decryption fails
 */
export const decrypt = (text: string): string | null => {
  try {
    // Split text into IV and encrypted data
    const parts = text.split(':');
    if (parts.length !== 2) {
      return null;
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const encryptedText = parts[1];
    
    // Create decipher with key and IV
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(ENCRYPTION_KEY), 
      iv
    );
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

/**
 * Hash sensitive data (one-way, cannot be decrypted)
 * Useful for passwords or other data that doesn't need to be retrieved
 * 
 * @param text Text to hash
 * @param salt Optional salt for hashing
 * @returns Hashed text with salt
 */
export const hash = (text: string, salt?: string): string => {
  // Generate salt if not provided
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  
  // Create hash with salt
  const hash = crypto.pbkdf2Sync(
    text,
    useSalt,
    10000, // Number of iterations
    64,    // Key length
    'sha512'
  ).toString('hex');
  
  // Return hash:salt format for verification later
  return `${hash}:${useSalt}`;
};

/**
 * Verify text against a stored hash
 * 
 * @param plainText Plain text to verify
 * @param storedHash Stored hash to compare against (hash:salt format)
 * @returns Boolean indicating if the plainText matches the hash
 */
export const verifyHash = (plainText: string, storedHash: string): boolean => {
  try {
    // Split hash and salt
    const [hash, salt] = storedHash.split(':');
    
    // Hash the plain text with the same salt
    const newHash = crypto.pbkdf2Sync(
      plainText,
      salt,
      10000,
      64,
      'sha512'
    ).toString('hex');
    
    // Compare the hashes (constant-time comparison to prevent timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(newHash)
    );
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
};

/**
 * Mask sensitive data for logging or display
 * 
 * @param text Text to mask
 * @param visibleChars Number of characters to show at start and end
 * @returns Masked string (e.g., "1234****5678")
 */
export const maskSensitiveData = (
  text: string, 
  visibleChars: number = 4
): string => {
  if (!text || text.length <= visibleChars * 2) {
    return '****';
  }
  
  const start = text.substring(0, visibleChars);
  const end = text.substring(text.length - visibleChars);
  
  return `${start}****${end}`;
};