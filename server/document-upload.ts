import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { storage } from './storage';
import { InsertDocument } from '@shared/schema';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { documents } from '@shared/schema';
import { sanitizeFilename } from './middleware/upload-validator';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const dmccDocsDir = path.join(process.cwd(), 'dmcc_docs');
const saifZoneDocsDir = path.join(process.cwd(), 'saif_zone_docs');

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
 * Determine the subcategory based on document title and path for SAIF Zone documents
 */
function determineSAIFZoneSubcategory(title: string, filePath: string, category: string): string {
  const lowerTitle = title.toLowerCase();
  const lowerPath = filePath.toLowerCase();
  
  // Business setup related subcategories
  if (category === 'business_setup') {
    if (lowerTitle.includes('company') || lowerTitle.includes('registration') || 
        lowerTitle.includes('formation') || lowerPath.includes('company_formation')) {
      return 'company_formation';
    }
    if (lowerTitle.includes('license') || lowerPath.includes('license')) {
      return 'license';
    }
    return 'business_setup_general';
  }
  
  // Financial related subcategories
  if (category === 'financial') {
    if (lowerTitle.includes('tax') || lowerPath.includes('tax')) {
      return 'tax_compliance';
    }
    if (lowerTitle.includes('accounting') || lowerPath.includes('accounting')) {
      return 'accounting';
    }
    if (lowerTitle.includes('banking') || lowerPath.includes('banking')) {
      return 'banking';
    }
    return 'financial_general';
  }

  // Compliance related subcategories
  if (category === 'compliance') {
    if (lowerTitle.includes('kyc') || lowerPath.includes('kyc')) {
      return 'kyc';
    }
    if (lowerTitle.includes('report') || lowerPath.includes('report')) {
      return 'reporting';
    }
    return 'compliance_general';
  }

  // Legal related subcategories
  if (category === 'legal') {
    if (lowerTitle.includes('contract') || lowerPath.includes('contract')) {
      return 'contracts';
    }
    if (lowerTitle.includes('dispute') || lowerPath.includes('dispute')) {
      return 'dispute_resolution';
    }
    return 'legal_general';
  }
  
  // Trade related subcategories
  if (category === 'trade') {
    if (lowerTitle.includes('import') || lowerTitle.includes('export') || 
        lowerPath.includes('import') || lowerPath.includes('export')) {
      return 'import_export';
    }
    if (lowerTitle.includes('certificate') || lowerPath.includes('certificate')) {
      return 'certificates';
    }
    return 'trade_general';
  }
  
  // Forms related subcategories
  if (category === 'forms') {
    if (lowerTitle.includes('registration') || lowerPath.includes('registration')) {
      return 'registration_forms';
    }
    if (lowerTitle.includes('visa') || lowerPath.includes('visa')) {
      return 'visa_forms';
    }
    if (lowerTitle.includes('license') || lowerPath.includes('license')) {
      return 'license_forms';
    }
    return 'general_forms';
  }
  
  // Default subcategory
  return '';
}

/**
 * Process SAIF Zone documents and add them to the database
 */
export async function processSAIFZoneDocuments() {
  try {
    console.log('Processing SAIF Zone documents...');
    
    // Check if saif_zone_docs directory exists
    if (!fs.existsSync(saifZoneDocsDir)) {
      console.log('SAIF Zone docs directory does not exist');
      return {
        processedCount: 0,
        addedCount: 0,
        errorCount: 0,
        messages: ['SAIF Zone docs directory does not exist'],
        success: false
      };
    }
    
    // Recursively find all files in the directory
    const allFiles = findAllFiles(saifZoneDocsDir);
    
    // Filter for supported file types
    const supportedExtensions = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.txt'];
    const documentFiles = allFiles.filter(file => 
      supportedExtensions.includes(path.extname(file).toLowerCase())
    );
    
    console.log(`Found ${documentFiles.length} document files in SAIF Zone docs directory and subdirectories`);
    
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
        const relativePath = path.relative(saifZoneDocsDir, filePath);
        const pathParts = relativePath.split(path.sep);
        
        // Use directory structure for categorization
        const category = pathParts.length > 1 ? pathParts[0] : 'general';
        
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
        
        // Determine subcategory based on title and path
        const subcategory = determineSAIFZoneSubcategory(title, filePath, category);
        
        // Create document in database
        const documentData: InsertDocument = {
          title,
          filename,
          filePath,
          fileSize,
          documentType,
          category,
          freeZoneId: 15, // SAIF Zone Free Zone ID
          metadata: {
            source: 'SAIF Zone Website',
            uploadMethod: 'automatic',
            processingDate: new Date().toISOString(),
            relativePath,
            subcategory,
            uploadedBy: 'system'
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
    
    // Get document count in database
    const documentsCount = await db
      .select({ count: sql`count(*)` })
      .from(documents);
    
    const totalDocCount = Number(documentsCount[0]?.count || 0);
    
    console.log(`Finished processing SAIF Zone documents`);
    console.log(`Summary: Processed ${processedCount} files, Added ${addedCount} documents, Errors: ${errorCount}`);
    console.log(`Total documents in database: ${totalDocCount}`);
    
    return {
      processedCount,
      addedCount,
      errorCount,
      totalDocuments: totalDocCount,
      messages: resultMessages,
      success: errorCount === 0
    };
  } catch (error) {
    console.error('Error processing SAIF Zone documents:', error);
    return {
      processedCount: 0,
      addedCount: 0,
      errorCount: 1,
      totalDocuments: 0,
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