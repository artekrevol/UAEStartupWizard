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
/**
 * Find all files recursively in a directory
 * @param dir Directory to search
 * @param fileList Array to store found files
 * @returns Array of file paths
 */
function findAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

export async function processDMCCDocuments() {
  try {
    console.log('Processing DMCC documents...');
    
    // Check if dmcc_docs directory exists
    if (!fs.existsSync(dmccDocsDir)) {
      console.log('DMCC docs directory does not exist');
      return {
        processedCount: 0,
        addedCount: 0,
        errorCount: 0,
        messages: ['DMCC docs directory does not exist'],
        success: false
      };
    }
    
    // Recursively find all files in the directory
    const allFiles = findAllFiles(dmccDocsDir);
    
    // Filter for supported file types
    const supportedExtensions = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.txt'];
    const documentFiles = allFiles.filter(file => 
      supportedExtensions.includes(path.extname(file).toLowerCase())
    );
    
    console.log(`Found ${documentFiles.length} document files in DMCC docs directory and subdirectories`);
    
    let processedCount = 0;
    let addedCount = 0;
    let errorCount = 0;
    let resultMessages: string[] = [];
    
    // Process each file
    for (const filePath of documentFiles) {
      try {
        // Get file stats
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;
        
        // Get relative path for category
        const relativePath = path.relative(dmccDocsDir, filePath);
        const pathParts = relativePath.split(path.sep);
        
        // Use directory structure for categorization
        const category = pathParts.length > 1 ? pathParts[0] : 'general';
        const subcategory = pathParts.length > 2 ? pathParts[1] : '';
        
        // Get filename
        const filename = path.basename(filePath);
        const documentType = path.extname(filename).replace('.', '');
        
        // Create title from filename
        const title = path.basename(filename, path.extname(filename))
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .replace(/[0-9]+\s+/, '') // Remove leading numbers
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Create document in database
        const documentData: InsertDocument = {
          title,
          filename,
          filePath,
          fileSize,
          documentType,
          category,
          freeZoneId: 14, // DMCC Free Zone ID
          metadata: {
            source: 'DMCC Knowledge Bank',
            uploadMethod: 'automatic',
            processingDate: new Date().toISOString(),
            relativePath,
            subcategory
          },
          content: null, // We'll add content extraction later if needed
          uploadedAt: new Date()
        };
        
        // Check if document already exists
        const exists = await checkDocumentExists(filename);
        
        if (!exists) {
          try {
            const document = await storage.createDocument(documentData);
            console.log(`Added document to database: ${title}`);
            resultMessages.push(`Added: ${title}`);
            addedCount++;
          } catch (dbError) {
            console.error(`Database error adding document ${title}:`, dbError);
            resultMessages.push(`Error adding ${title}: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
            errorCount++;
          }
        } else {
          console.log(`Document already exists: ${title}`);
          resultMessages.push(`Skipped (exists): ${title}`);
        }
        
        processedCount++;
      } catch (error) {
        console.error(`Error processing document ${filePath}:`, error);
        resultMessages.push(`Error processing: ${path.basename(filePath)}`);
        errorCount++;
      }
    }
    
    console.log(`Finished processing DMCC documents`);
    console.log(`Summary: Processed ${processedCount} files, Added ${addedCount} documents, Errors: ${errorCount}`);
    
    return {
      processedCount,
      addedCount,
      errorCount,
      messages: resultMessages,
      success: errorCount === 0
    };
  } catch (error) {
    console.error('Error processing DMCC documents:', error);
    return {
      processedCount: 0,
      addedCount: 0,
      errorCount: 1,
      messages: [`Global error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      success: false
    };
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