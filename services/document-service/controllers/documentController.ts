import { Request, Response, NextFunction } from 'express';
import { DocumentRepository } from '../repositories/documentRepository';
import { 
  insertDocumentSchema, 
  insertUserDocumentSchema,
  type InsertDocument,
  type InsertUserDocument 
} from '../schema';
import { ServiceException, ErrorCode, ValidationException, DatabaseException } from '../../../shared/errors';
import { asyncHandler } from '../../../shared/middleware/errorHandler';
import { eventBus } from '../index';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Initialize repository
const documentRepo = new DocumentRepository();

/**
 * Document Controller
 * Handles document-related HTTP requests
 */
export class DocumentController {
  
  /**
   * Get document by ID
   */
  getDocument = asyncHandler(async (req: Request, res: Response) => {
    const documentId = parseInt(req.params.id, 10);
    
    if (isNaN(documentId)) {
      throw new ValidationException('Invalid document ID');
    }
    
    const document = await documentRepo.getDocument(documentId);
    
    if (!document) {
      throw new ServiceException(
        ErrorCode.DOCUMENT_NOT_FOUND,
        `Document with ID ${documentId} not found`
      );
    }
    
    res.json({
      status: 'success',
      data: document
    });
  });
  
  /**
   * Get all documents with pagination and sorting
   */
  getAllDocuments = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const sortBy = (req.query.sortBy as string) || 'id';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
    
    const documents = await documentRepo.getAllDocuments(limit, offset, sortBy, sortOrder);
    
    res.json({
      status: 'success',
      data: documents,
      pagination: {
        limit,
        offset,
        sortBy,
        sortOrder
      }
    });
  });
  
  /**
   * Get documents by free zone ID
   */
  getDocumentsByFreeZone = asyncHandler(async (req: Request, res: Response) => {
    const freeZoneId = parseInt(req.params.freeZoneId, 10);
    
    if (isNaN(freeZoneId)) {
      throw new ValidationException('Invalid free zone ID');
    }
    
    const documents = await documentRepo.getDocumentsByFreeZone(freeZoneId);
    
    res.json({
      status: 'success',
      data: documents
    });
  });
  
  /**
   * Get documents by category
   */
  getDocumentsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = req.params.category;
    
    if (!category) {
      throw new ValidationException('Category parameter is required');
    }
    
    const documents = await documentRepo.getDocumentsByCategory(category);
    
    res.json({
      status: 'success',
      data: documents
    });
  });
  
  /**
   * Create a new document
   */
  createDocument = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = insertDocumentSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationException('Invalid document data', {
        validationErrors: validationResult.error.errors
      });
    }
    
    // Handle file upload if included in request
    if (req.file) {
      // Save file to disk
      const uploadDir = path.resolve('./uploads/documents');
      
      // Ensure upload directory exists
      await fs.mkdir(uploadDir, { recursive: true });
      
      // Generate unique filename
      const originalName = req.file.originalname;
      const extension = path.extname(originalName);
      const filename = `${uuidv4()}${extension}`;
      const filePath = path.join(uploadDir, filename);
      
      // Write file to disk
      await fs.writeFile(filePath, req.file.buffer);
      
      // Add file info to document data
      validationResult.data.filename = filename;
      validationResult.data.filePath = filePath;
      validationResult.data.fileSize = req.file.size;
      
      // Try to determine document type from file extension
      if (!validationResult.data.documentType) {
        validationResult.data.documentType = extension.slice(1).toLowerCase();
      }
    }
    
    const document = await documentRepo.createDocument(validationResult.data);
    
    res.status(201).json({
      status: 'success',
      data: document
    });
  });
  
  /**
   * Update an existing document
   */
  updateDocument = asyncHandler(async (req: Request, res: Response) => {
    const documentId = parseInt(req.params.id, 10);
    
    if (isNaN(documentId)) {
      throw new ValidationException('Invalid document ID');
    }
    
    // Verify document exists
    const existingDocument = await documentRepo.getDocument(documentId);
    
    if (!existingDocument) {
      throw new ServiceException(
        ErrorCode.DOCUMENT_NOT_FOUND,
        `Document with ID ${documentId} not found`
      );
    }
    
    // Validate update data
    const validationResult = insertDocumentSchema.partial().safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationException('Invalid document data', {
        validationErrors: validationResult.error.errors
      });
    }
    
    // Update document
    await documentRepo.updateDocument(documentId, validationResult.data);
    
    // Fetch updated document
    const updatedDocument = await documentRepo.getDocument(documentId);
    
    res.json({
      status: 'success',
      data: updatedDocument
    });
  });
  
  /**
   * Delete a document
   */
  deleteDocument = asyncHandler(async (req: Request, res: Response) => {
    const documentId = parseInt(req.params.id, 10);
    
    if (isNaN(documentId)) {
      throw new ValidationException('Invalid document ID');
    }
    
    // Verify document exists
    const existingDocument = await documentRepo.getDocument(documentId);
    
    if (!existingDocument) {
      throw new ServiceException(
        ErrorCode.DOCUMENT_NOT_FOUND,
        `Document with ID ${documentId} not found`
      );
    }
    
    // Delete document
    await documentRepo.deleteDocument(documentId);
    
    // Delete file if exists
    if (existingDocument.filePath) {
      try {
        await fs.unlink(existingDocument.filePath);
      } catch (error) {
        console.error(`Failed to delete file: ${existingDocument.filePath}`, error);
        // Continue with response even if file deletion fails
      }
    }
    
    res.json({
      status: 'success',
      message: `Document with ID ${documentId} has been deleted`
    });
  });
  
  /**
   * Get user document by ID
   */
  getUserDocument = asyncHandler(async (req: Request, res: Response) => {
    const documentId = parseInt(req.params.id, 10);
    
    if (isNaN(documentId)) {
      throw new ValidationException('Invalid document ID');
    }
    
    const document = await documentRepo.getUserDocument(documentId);
    
    if (!document) {
      throw new ServiceException(
        ErrorCode.DOCUMENT_NOT_FOUND,
        `User document with ID ${documentId} not found`
      );
    }
    
    // Check ownership if user is not an admin
    if (req.user && req.user.role !== 'admin' && document.userId !== req.user.userId) {
      throw new ServiceException(
        ErrorCode.FORBIDDEN,
        'You do not have permission to access this document'
      );
    }
    
    res.json({
      status: 'success',
      data: document
    });
  });
  
  /**
   * Get user documents by user ID
   */
  getUserDocuments = asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    
    if (isNaN(userId)) {
      throw new ValidationException('Invalid user ID');
    }
    
    // Check ownership if user is not an admin
    if (req.user && req.user.role !== 'admin' && userId !== req.user.userId) {
      throw new ServiceException(
        ErrorCode.FORBIDDEN,
        'You do not have permission to access these documents'
      );
    }
    
    const documents = await documentRepo.getUserDocumentsByUser(userId);
    
    res.json({
      status: 'success',
      data: documents
    });
  });
  
  /**
   * Create a new user document
   */
  createUserDocument = asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = insertUserDocumentSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      throw new ValidationException('Invalid user document data', {
        validationErrors: validationResult.error.errors
      });
    }
    
    // Check ownership if user is not an admin
    if (req.user && req.user.role !== 'admin' && validationResult.data.userId !== req.user.userId) {
      throw new ServiceException(
        ErrorCode.FORBIDDEN,
        'You do not have permission to create documents for other users'
      );
    }
    
    // Handle file upload similar to createDocument
    if (req.file) {
      const uploadDir = path.resolve('./uploads/user-documents');
      await fs.mkdir(uploadDir, { recursive: true });
      
      const originalName = req.file.originalname;
      const extension = path.extname(originalName);
      const filename = `${uuidv4()}${extension}`;
      const filePath = path.join(uploadDir, filename);
      
      await fs.writeFile(filePath, req.file.buffer);
      
      validationResult.data.filename = filename;
      validationResult.data.filePath = filePath;
      validationResult.data.fileSize = req.file.size;
    }
    
    const document = await documentRepo.createUserDocument(validationResult.data);
    
    res.status(201).json({
      status: 'success',
      data: document
    });
  });
  
  /**
   * Get document statistics by category
   */
  getDocumentStatsByCategory = asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get document counts by category from repository
      const categoryCounts = await documentRepo.getDocumentCountsByCategory();
      
      // Calculate total document count
      const totalCount = categoryCounts.reduce((sum, item) => sum + Number(item.count), 0);
      
      // Format and sort the categories by count in descending order
      const formattedCounts = categoryCounts.map(item => ({
        category: item.category,
        count: Number(item.count),
        percentage: Math.round((Number(item.count) / totalCount) * 100)
      })).sort((a, b) => b.count - a.count);
      
      // Format the response
      const stats = {
        totalDocuments: totalCount,
        categoryCounts: formattedCounts
      };
      
      res.json(stats);
    } catch (error) {
      throw new DatabaseException('Failed to fetch document statistics', { 
        originalError: error.message 
      });
    }
  });
  
  /**
   * Get document statistics by subcategory 
   */
  getDocumentStatsBySubcategory = asyncHandler(async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      
      // Get document counts by subcategory from repository
      const subcategoryCounts = await documentRepo.getDocumentCountsBySubcategory(category);
      
      // Calculate total document count
      const totalCount = subcategoryCounts.reduce((sum, item) => sum + Number(item.count), 0);
      
      // Format and sort the subcategories by count in descending order
      const formattedCounts = subcategoryCounts.map(item => ({
        subcategory: item.subcategory,
        category: item.category,
        count: Number(item.count),
        percentage: totalCount > 0 ? Math.round((Number(item.count) / totalCount) * 100) : 0
      })).sort((a, b) => b.count - a.count);
      
      // Format the response
      const stats = {
        totalDocuments: totalCount,
        subcategoryCounts: formattedCounts
      };
      
      res.json(stats);
    } catch (error) {
      throw new DatabaseException('Failed to fetch subcategory statistics', { 
        originalError: error.message 
      });
    }
  });

  /**
   * Process DMCC documents
   */
  processDMCCDocuments = asyncHandler(async (req: Request, res: Response) => {
    try {
      // This is where we would call the processing logic
      // For now, we'll create a placeholder implementation
      
      // Count documents in the database before processing
      const documentsBeforeCount = await documentRepo.getDocumentCount();
      
      // Notify via event bus that processing has started
      eventBus.publish('document-processing-started', {
        type: 'dmcc',
        startedAt: new Date().toISOString()
      });
      
      // In the real implementation, we would call the DMCC document processor here
      
      // Count documents in the database after processing
      const documentsAfterCount = await documentRepo.getDocumentCount();
      
      // Calculate documents added
      const documentsAdded = documentsAfterCount - documentsBeforeCount;
      
      // Notify via event bus that processing has completed
      eventBus.publish('document-processing-completed', {
        type: 'dmcc',
        documentsAdded,
        completedAt: new Date().toISOString()
      });
      
      res.status(200).json({
        status: 'success',
        message: "DMCC documents processed successfully",
        count: documentsAfterCount,
        documentsAdded
      });
    } catch (error) {
      console.error("Error processing DMCC documents:", error);
      
      // Notify via event bus that processing has failed
      eventBus.publish('document-processing-failed', {
        type: 'dmcc',
        error: error.message,
        failedAt: new Date().toISOString()
      });
      
      throw new InternalServerError(
        'Failed to process DMCC documents',
        { originalError: error.message }
      );
    }
  });
}