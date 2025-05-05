/**
 * Document Management Service - Handles document upload, storage, and retrieval
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { errorHandlerMiddleware, ServiceException, ErrorCode } from '../../shared/errors';
import { createEventBus, EventType, createEvent } from '../../shared/event-bus';

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const db = drizzle(pool);

// Initialize event bus
const eventBus = createEventBus();

// Configure upload directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Constants for file validation
const ALLOWED_MIME_TYPES = [
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  'text/markdown',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif'
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename suffix
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    
    // Use our sanitizeFilename function to fully sanitize the name and extension
    const safeFilename = sanitizeFilename(file.originalname);
    
    // Get the safe extension from the sanitized filename
    const ext = path.extname(safeFilename);
    
    // Create the final filename with the fieldname prefix for better organization
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    // Sanitize filename before accepting
    file.originalname = sanitizeFilename(file.originalname);
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only document, image, and text files are allowed.`));
  }
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Utility function to sanitize a filename
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'file_' + Date.now();
  }

  // Remove any path components (e.g., "../../")
  let sanitized = path.basename(filename);
  
  // Split filename and extension
  const extname = path.extname(sanitized);
  const basename = path.basename(sanitized, extname);
  
  // Clean the basename - replace any non-alphanumeric characters except for hyphens and underscores
  const cleanBasename = basename
    .replace(/[^a-zA-Z0-9\-_]/g, '_')  // Replace invalid chars with underscores
    .replace(/^[\-_.]+/, '')           // Remove leading special chars
    .slice(0, 200);                    // Limit basename length
  
  // Clean the extension - only allow specific extensions
  const allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.md'
  ];
  
  // Normalize extension to lowercase and check if it's allowed
  const normalizedExt = extname.toLowerCase();
  const finalExt = allowedExtensions.includes(normalizedExt) ? normalizedExt : '.txt';
  
  // Ensure filename isn't empty after sanitization
  if (!cleanBasename) {
    return 'file_' + Date.now() + finalExt;
  }
  
  return cleanBasename + finalExt;
}

// Define routes

// Upload document
app.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      throw new ServiceException(
        ErrorCode.INVALID_DOCUMENT,
        'No file uploaded'
      );
    }
    
    // Extract document metadata from request
    const { category = 'general', subcategory, title, freeZoneId } = req.body;
    
    // Get user ID from auth context
    const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : undefined;
    
    // Create document in database (mock for now)
    const document = {
      id: Math.floor(Math.random() * 1000),
      title: title || path.basename(file.originalname, path.extname(file.originalname)),
      filename: file.filename,
      filePath: file.path,
      mimetype: file.mimetype,
      size: file.size,
      category,
      subcategory: subcategory || null,
      freeZoneId: freeZoneId ? parseInt(freeZoneId) : null,
      userId,
      createdAt: new Date()
    };
    
    // Publish document uploaded event
    await eventBus.publish(createEvent(EventType.DOCUMENT_UPLOADED, {
      id: document.id,
      filename: document.filename,
      category: document.category,
      freeZoneId: document.freeZoneId
    }));
    
    // Return success
    res.status(201).json(document);
    
  } catch (error) {
    // Clean up file if upload processing fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Get all documents
app.get('/', async (req, res, next) => {
  try {
    const { category, freeZoneId } = req.query;
    
    // In production, fetch documents from database with filters
    // let query = db.select().from(documents);
    // if (category) query = query.where(eq(documents.category, category));
    // if (freeZoneId) query = query.where(eq(documents.freeZoneId, parseInt(freeZoneId)));
    // const documents = await query;
    
    // Mock response
    const mockDocuments = [
      {
        id: 1,
        title: 'Business Setup Guide',
        filename: 'business-setup-1234.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        category: 'business_setup',
        subcategory: 'guide',
        freeZoneId: 1,
        createdAt: new Date()
      },
      {
        id: 2,
        title: 'Visa Requirements',
        filename: 'visa-requirements-5678.pdf',
        mimetype: 'application/pdf',
        size: 512 * 1024,
        category: 'visa',
        subcategory: 'requirements',
        freeZoneId: 1,
        createdAt: new Date()
      }
    ];
    
    // Apply filters if provided
    let filteredDocs = [...mockDocuments];
    if (category) {
      filteredDocs = filteredDocs.filter(doc => doc.category === category);
    }
    if (freeZoneId) {
      filteredDocs = filteredDocs.filter(doc => doc.freeZoneId === parseInt(freeZoneId as string));
    }
    
    res.json(filteredDocs);
    
  } catch (error) {
    next(error);
  }
});

// Get document by ID
app.get('/:id', async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id);
    
    // In production, fetch document from database
    // const document = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    
    // Mock response
    if (documentId === 1) {
      res.json({
        id: 1,
        title: 'Business Setup Guide',
        filename: 'business-setup-1234.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        category: 'business_setup',
        subcategory: 'guide',
        freeZoneId: 1,
        createdAt: new Date()
      });
    } else if (documentId === 2) {
      res.json({
        id: 2,
        title: 'Visa Requirements',
        filename: 'visa-requirements-5678.pdf',
        mimetype: 'application/pdf',
        size: 512 * 1024,
        category: 'visa',
        subcategory: 'requirements',
        freeZoneId: 1,
        createdAt: new Date()
      });
    } else {
      throw new ServiceException(
        ErrorCode.DOCUMENT_NOT_FOUND,
        `Document with ID ${documentId} not found`
      );
    }
  } catch (error) {
    next(error);
  }
});

// Download document
app.get('/:id/download', async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id);
    
    // In production, fetch document from database
    // const document = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    
    // Mock document paths for demo
    const mockPaths = {
      1: {
        path: path.join(uploadsDir, 'sample-business-setup.pdf'),
        mimetype: 'application/pdf',
        filename: 'Business Setup Guide.pdf'
      },
      2: {
        path: path.join(uploadsDir, 'sample-visa-requirements.pdf'),
        mimetype: 'application/pdf',
        filename: 'Visa Requirements.pdf'
      }
    };
    
    const documentInfo = mockPaths[documentId];
    
    if (!documentInfo) {
      throw new ServiceException(
        ErrorCode.DOCUMENT_NOT_FOUND,
        `Document with ID ${documentId} not found`
      );
    }
    
    // In a real implementation, we would check if the file exists
    // Since this is just a mock, we'll simulate file not found for certain cases
    if (documentId > 10) {
      throw new ServiceException(
        ErrorCode.DOCUMENT_NOT_FOUND,
        `Document file not found`
      );
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', documentInfo.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${documentInfo.filename}"`);
    
    // In a real implementation, we would stream the file
    // Since this is a mock, we'll just send a sample response
    res.send(`This is a sample document content for ${documentInfo.filename}`);
    
  } catch (error) {
    next(error);
  }
});

// Delete document
app.delete('/:id', async (req, res, next) => {
  try {
    const documentId = parseInt(req.params.id);
    
    // In production, fetch document from database and delete it
    // const document = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    // if (!document.length) throw new ServiceException(...);
    // await db.delete(documents).where(eq(documents.id, documentId));
    
    // Mock deletion
    if (documentId <= 0) {
      throw new ServiceException(
        ErrorCode.DOCUMENT_NOT_FOUND,
        `Document with ID ${documentId} not found`
      );
    }
    
    // Publish document deleted event
    await eventBus.publish(createEvent(EventType.DOCUMENT_DELETED, {
      id: documentId
    }));
    
    // Return success with no content
    res.status(204).end();
    
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use(errorHandlerMiddleware);

// Start server
app.listen(PORT, () => {
  console.log(`[Document Service] Server running on port ${PORT}`);
});
