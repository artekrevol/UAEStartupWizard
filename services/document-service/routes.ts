import express from 'express';
import multer from 'multer';
import { DocumentController } from './controllers/documentController';
import { authenticateJWT, requireAdmin } from '../../services/api-gateway/middleware/auth';
import { DocumentRepository } from './repositories/documentRepository';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow common document file types
    const allowedMimeTypes = [
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
      'image/gif',
      'application/zip',
      'application/x-zip-compressed',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

// Initialize controller and repository
const documentController = new DocumentController();
const documentRepo = new DocumentRepository();

// Create router
const router = express.Router();

/**
 * Document Routes
 */

// Get all documents (with pagination)
router.get('/documents', authenticateJWT, documentController.getAllDocuments);

// Get document by ID
router.get('/documents/:id', authenticateJWT, documentController.getDocument);

// Get documents by free zone
router.get('/documents/freezone/:freeZoneId', authenticateJWT, documentController.getDocumentsByFreeZone);

// Get documents by category
router.get('/documents/category/:category', authenticateJWT, documentController.getDocumentsByCategory);

// Create a new document (admin only)
router.post(
  '/documents',
  authenticateJWT,
  requireAdmin,
  upload.single('file'),
  documentController.createDocument
);

// Update a document (admin only)
router.put(
  '/documents/:id',
  authenticateJWT,
  requireAdmin,
  documentController.updateDocument
);

// Delete a document (admin only)
router.delete(
  '/documents/:id',
  authenticateJWT,
  requireAdmin,
  documentController.deleteDocument
);

/**
 * User Document Routes
 */

// Get user document by ID
router.get('/user-documents/:id', authenticateJWT, documentController.getUserDocument);

// Get user documents
router.get('/user-documents/user/:userId', authenticateJWT, documentController.getUserDocuments);

// Create a new user document
router.post(
  '/user-documents',
  authenticateJWT,
  upload.single('file'),
  documentController.createUserDocument
);

// Document statistics routes
router.get('/documents/stats', documentController.getDocumentStatsByCategory);
router.get('/documents/stats/subcategories', documentController.getDocumentStatsBySubcategory);

// Document processing routes
router.get('/documents/process-dmcc', 
  authenticateJWT, 
  requireAdmin, 
  documentController.processDMCCDocuments
);

// Public endpoint for DMCC document processing
router.get('/public/documents/process-dmcc', documentController.processDMCCDocuments);

// Document search route
router.post('/documents/search', authenticateJWT, async (req, res, next) => {
  try {
    const { searchTerm, filters, limit, offset } = req.body;
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Search term is required'
      });
    }
    
    const results = await documentRepo.searchDocuments(
      searchTerm,
      filters || {},
      limit || 50,
      offset || 0
    );
    
    res.json({
      status: 'success',
      data: results
    });
  } catch (error) {
    next(error);
  }
});

export default router;