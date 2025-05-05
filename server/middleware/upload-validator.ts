import { Request, Response, NextFunction } from 'express';
import path from 'path';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif'
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Middleware to validate file uploads
 * Ensures only allowed file types and sizes are processed
 */
export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  // If no file was uploaded, proceed
  if (!req.file && (!req.files || Object.keys(req.files || {}).length === 0)) {
    return next();
  }

  // Handle single file upload
  if (req.file) {
    const file = req.file;
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        error: 'File too large', 
        message: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      });
    }
    
    // Check file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type', 
        message: 'Only document, image, and text files are allowed' 
      });
    }
  }
  
  // Handle multiple file upload
  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    
    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ 
          error: 'File too large', 
          message: `File '${file.originalname}' exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
        });
      }
      
      // Check file type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ 
          error: 'Invalid file type', 
          message: `File '${file.originalname}' has an invalid type. Only document, image, and text files are allowed` 
        });
      }
    }
  }
  
  next();
}

/**
 * Utility function to sanitize a filename
 * Removes potentially dangerous characters and ensures proper extension
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components (e.g., "../../")
  let sanitized = path.basename(filename);
  
  // Replace any non-alphanumeric characters except for periods, hyphens, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  
  // Ensure filename isn't empty after sanitization
  if (!sanitized || sanitized === '.') {
    sanitized = 'file_' + Date.now();
  }
  
  return sanitized;
}
