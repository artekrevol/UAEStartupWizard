import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { storage } from './storage';
import { InsertDocument } from '@shared/schema';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const dmccDocsDir = path.join(process.cwd(), 'dmcc_docs');

// Create directories if they don't exist
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating uploads directory:', error);
}

/**
 * Process downloaded DMCC documents and store them in the database
 */
export async function processDMCCDocuments() {
  try {
    console.log('Processing DMCC documents...');
    
    // Check if dmcc_docs directory exists
    if (!fs.existsSync(dmccDocsDir)) {
      console.log('DMCC docs directory does not exist');
      return;
    }
    
    // Read all files in the directory
    const files = fs.readdirSync(dmccDocsDir);
    console.log(`Found ${files.length} files in DMCC docs directory`);
    
    // Process each file
    for (const file of files) {
      const filePath = path.join(dmccDocsDir, file);
      const stats = fs.statSync(filePath);
      
      // Skip directories
      if (stats.isDirectory()) {
        continue;
      }
      
      // Check if document already exists in the database
      const fileStats = fs.statSync(filePath);
      const fileSize = fileStats.size;
      
      // Extract document metadata from filename
      // Example filename: "dmcc_company-setup_guidelines.pdf"
      const filenameParts = file.split('_');
      const category = filenameParts.length > 1 ? filenameParts[1] : 'general';
      const documentType = path.extname(file).replace('.', '');
      const title = path.basename(file, path.extname(file))
        .replace(/dmcc_/, '')
        .replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Create document in database
      const documentData: InsertDocument = {
        title,
        filename: file,
        filePath: filePath,
        fileSize,
        documentType,
        category,
        freeZoneId: 14, // DMCC Free Zone ID
        metadata: {
          source: 'DMCC Knowledge Bank',
          uploadMethod: 'automatic',
          processingDate: new Date().toISOString()
        },
        content: null, // We'll add content extraction later if needed
        uploadedAt: new Date()
      };
      
      try {
        // Check if document already exists
        // For now we're just doing a basic check by filename
        const exists = await checkDocumentExists(file);
        
        if (!exists) {
          const document = await storage.createDocument(documentData);
          console.log(`Added document to database: ${title}`);
        } else {
          console.log(`Document already exists: ${title}`);
        }
      } catch (error) {
        console.error(`Error adding document ${file} to database:`, error);
      }
    }
    
    console.log('Finished processing DMCC documents');
  } catch (error) {
    console.error('Error processing DMCC documents:', error);
  }
}

/**
 * Check if a document already exists in the database
 */
async function checkDocumentExists(filename: string): Promise<boolean> {
  try {
    // Use the storage interface instead of a direct query
    const documents = await storage.getDocumentsByFilename(filename);
    return documents.length > 0;
  } catch (error) {
    console.error('Error checking if document exists:', error);
    return false;
  }
}

/**
 * Configure multer storage for file uploads
 */
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

/**
 * Filter function to validate uploaded files
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept PDFs, docs, images, text files, etc.
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'text/plain', // Added for testing
    'text/csv',
    'text/markdown'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

/**
 * Multer instance for document uploads
 */
export const documentUpload = multer({
  storage: documentStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * Express middleware to process uploaded document
 */
export function processUploadedDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const file = req.file as Express.Multer.File;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Extract document type and category from the request
    const { documentType = 'general', category = 'general', title, freeZoneId } = req.body;
    
    // Add metadata to the request for the next middleware
    req.body.documentFile = {
      filename: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimetype: file.mimetype,
      documentType,
      category,
      title: title || file.originalname.replace(/\.[^/.]+$/, ''),
      freeZoneId: freeZoneId ? parseInt(freeZoneId) : null
    };
    
    next();
  } catch (error) {
    console.error('Error processing uploaded document:', error);
    return res.status(500).json({ message: 'Error processing uploaded document' });
  }
}