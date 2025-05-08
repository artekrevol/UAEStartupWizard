import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db';
import { 
  documents, 
  userDocuments, 
  documentTemplates, 
  documentTypes,
  templateSubmissions,
  saifZoneForms,
  documentAuditLogs,
  documentAccessControls,
  type Document,
  type InsertDocument,
  type UserDocument,
  type InsertUserDocument,
  type DocumentTemplate,
  type InsertDocumentTemplate,
  type TemplateSubmission,
  type InsertTemplateSubmission,
  type DocumentType,
  type InsertDocumentType,
  type SaifZoneForm,
  type InsertSaifZoneForm,
  type DocumentAuditLog,
  type InsertDocumentAuditLog,
  type DocumentAccessControl,
  type InsertDocumentAccessControl
} from '../schema';
import { NotFoundException, DatabaseException } from '../../../shared/errors';

/**
 * Document Repository
 * Handles database operations for documents and related entities
 */
export class DocumentRepository {
  /**
   * Document Methods
   */
  
  // Get a document by ID
  async getDocument(id: number): Promise<Document | undefined> {
    try {
      const [document] = await db.select().from(documents).where(eq(documents.id, id));
      return document;
    } catch (error) {
      throw new DatabaseException('Failed to fetch document', { originalError: error.message });
    }
  }

  // Get documents by free zone ID
  async getDocumentsByFreeZone(freeZoneId: number): Promise<Document[]> {
    try {
      return await db.select().from(documents).where(eq(documents.freeZoneId, freeZoneId));
    } catch (error) {
      throw new DatabaseException('Failed to fetch documents by free zone', { originalError: error.message });
    }
  }

  // Get documents by category
  async getDocumentsByCategory(category: string): Promise<Document[]> {
    try {
      return await db.select().from(documents).where(eq(documents.category, category));
    } catch (error) {
      throw new DatabaseException('Failed to fetch documents by category', { originalError: error.message });
    }
  }

  // Get documents by filename
  async getDocumentsByFilename(filename: string): Promise<Document[]> {
    try {
      return await db.select().from(documents).where(eq(documents.filename, filename));
    } catch (error) {
      throw new DatabaseException('Failed to fetch documents by filename', { originalError: error.message });
    }
  }
  
  // Get all documents
  async getAllDocuments(
    limit: number = 50, 
    offset: number = 0, 
    sortBy: keyof Document = 'id',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<Document[]> {
    try {
      const query = db.select().from(documents)
        .limit(limit)
        .offset(offset);
        
      // Add sorting
      if (sortOrder === 'asc') {
        query.orderBy(asc(documents[sortBy as keyof typeof documents]));
      } else {
        query.orderBy(desc(documents[sortBy as keyof typeof documents]));
      }
      
      return await query;
    } catch (error) {
      throw new DatabaseException('Failed to fetch all documents', { originalError: error.message });
    }
  }

  // Create a document
  async createDocument(document: InsertDocument): Promise<Document> {
    try {
      const [createdDocument] = await db
        .insert(documents)
        .values(document)
        .returning();
      return createdDocument;
    } catch (error) {
      throw new DatabaseException('Failed to create document', { originalError: error.message });
    }
  }

  // Update a document
  async updateDocument(id: number, document: Partial<Document>): Promise<void> {
    try {
      const result = await db
        .update(documents)
        .set({
          ...document,
          lastUpdated: new Date()
        })
        .where(eq(documents.id, id))
        .returning({ id: documents.id });
        
      if (!result.length) {
        throw new NotFoundException('Document', id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new DatabaseException('Failed to update document', { originalError: error.message });
    }
  }

  // Delete a document
  async deleteDocument(id: number): Promise<void> {
    try {
      const result = await db
        .delete(documents)
        .where(eq(documents.id, id))
        .returning({ id: documents.id });
        
      if (!result.length) {
        throw new NotFoundException('Document', id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new DatabaseException('Failed to delete document', { originalError: error.message });
    }
  }

  /**
   * User Document Methods
   */
  
  // Get a user document by ID
  async getUserDocument(id: number): Promise<UserDocument | undefined> {
    try {
      const [document] = await db.select().from(userDocuments).where(eq(userDocuments.id, id));
      return document;
    } catch (error) {
      throw new DatabaseException('Failed to fetch user document', { originalError: error.message });
    }
  }

  // Get user documents by user ID
  async getUserDocumentsByUser(userId: number): Promise<UserDocument[]> {
    try {
      return await db
        .select()
        .from(userDocuments)
        .where(eq(userDocuments.userId, userId))
        .orderBy(desc(userDocuments.uploadedAt));
    } catch (error) {
      throw new DatabaseException('Failed to fetch user documents', { originalError: error.message });
    }
  }

  // Get user documents by type
  async getUserDocumentsByType(userId: number, documentType: string): Promise<UserDocument[]> {
    try {
      return await db
        .select()
        .from(userDocuments)
        .where(and(
          eq(userDocuments.userId, userId),
          eq(userDocuments.documentType, documentType)
        ))
        .orderBy(desc(userDocuments.uploadedAt));
    } catch (error) {
      throw new DatabaseException('Failed to fetch user documents by type', { originalError: error.message });
    }
  }

  // Get user documents by category
  async getUserDocumentsByCategory(userId: number, category: string): Promise<UserDocument[]> {
    try {
      return await db
        .select()
        .from(userDocuments)
        .where(and(
          eq(userDocuments.userId, userId),
          eq(userDocuments.documentCategory, category)
        ))
        .orderBy(desc(userDocuments.uploadedAt));
    } catch (error) {
      throw new DatabaseException('Failed to fetch user documents by category', { originalError: error.message });
    }
  }

  // Create a user document
  async createUserDocument(document: InsertUserDocument): Promise<UserDocument> {
    try {
      const [createdDocument] = await db
        .insert(userDocuments)
        .values(document)
        .returning();
      return createdDocument;
    } catch (error) {
      throw new DatabaseException('Failed to create user document', { originalError: error.message });
    }
  }

  // Update a user document
  async updateUserDocument(id: number, document: Partial<UserDocument>): Promise<void> {
    try {
      const result = await db
        .update(userDocuments)
        .set({
          ...document,
          updatedAt: new Date()
        })
        .where(eq(userDocuments.id, id))
        .returning({ id: userDocuments.id });
        
      if (!result.length) {
        throw new NotFoundException('User Document', id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new DatabaseException('Failed to update user document', { originalError: error.message });
    }
  }

  // Delete a user document
  async deleteUserDocument(id: number): Promise<void> {
    try {
      const result = await db
        .delete(userDocuments)
        .where(eq(userDocuments.id, id))
        .returning({ id: userDocuments.id });
        
      if (!result.length) {
        throw new NotFoundException('User Document', id);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new DatabaseException('Failed to delete user document', { originalError: error.message });
    }
  }
  
  /**
   * Document Template Methods
   */
  
  // Get a document template by ID
  async getDocumentTemplate(id: number): Promise<DocumentTemplate | undefined> {
    try {
      const [template] = await db.select().from(documentTemplates).where(eq(documentTemplates.id, id));
      return template;
    } catch (error) {
      throw new DatabaseException('Failed to fetch document template', { originalError: error.message });
    }
  }

  // Get document templates by free zone ID
  async getDocumentTemplatesByFreeZone(freeZoneId: number): Promise<DocumentTemplate[]> {
    try {
      return await db
        .select()
        .from(documentTemplates)
        .where(eq(documentTemplates.freeZoneId, freeZoneId))
        .orderBy(documentTemplates.name);
    } catch (error) {
      throw new DatabaseException('Failed to fetch document templates by free zone', { originalError: error.message });
    }
  }

  /**
   * Get document count by category
   */
  async getDocumentCountsByCategory(): Promise<Array<{ category: string, count: number }>> {
    try {
      const result = await db
        .select({
          category: documents.category,
          count: sql`count(*)`,
        })
        .from(documents)
        .groupBy(documents.category);
      
      return result.map(item => ({
        category: item.category || 'uncategorized',
        count: Number(item.count)
      }));
    } catch (error) {
      throw new DatabaseException('Failed to fetch document counts by category', { originalError: error.message });
    }
  }
  
  /**
   * Get document count by subcategory
   */
  async getDocumentCountsBySubcategory(category?: string): Promise<Array<{ category: string, subcategory: string, count: number }>> {
    try {
      let query = db
        .select({
          category: documents.category,
          subcategory: documents.subcategory,
          count: sql`count(*)`,
        })
        .from(documents);
      
      // Apply category filter if provided
      if (category) {
        query = query.where(eq(documents.category, category));
      }
      
      const result = await query.groupBy(documents.category, documents.subcategory);
      
      return result.map(item => ({
        category: item.category || 'uncategorized',
        subcategory: item.subcategory || 'general',
        count: Number(item.count)
      }));
    } catch (error) {
      throw new DatabaseException('Failed to fetch document counts by subcategory', { originalError: error.message });
    }
  }
  
  /**
   * Get total document count
   */
  async getDocumentCount(): Promise<number> {
    try {
      const result = await db
        .select({ count: sql`count(*)` })
        .from(documents);
      
      return Number(result[0]?.count || 0);
    } catch (error) {
      throw new DatabaseException('Failed to fetch document count', { originalError: error.message });
    }
  }

  /**
   * Search documents by text
   */
  async searchDocuments(
    searchTerm: string,
    filters: { category?: string; subcategory?: string; freeZoneId?: number } = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<Document[]> {
    try {
      let query = db
        .select()
        .from(documents)
        .where(
          sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')) @@ to_tsquery('english', ${searchTerm.split(' ').join(' & ')})`
        );
      
      // Apply filters
      if (filters.category) {
        query = query.where(eq(documents.category, filters.category));
      }
      
      if (filters.subcategory) {
        query = query.where(eq(documents.subcategory, filters.subcategory));
      }
      
      if (filters.freeZoneId) {
        query = query.where(eq(documents.freeZoneId, filters.freeZoneId));
      }
      
      // Apply pagination
      query = query.limit(limit).offset(offset);
      
      return await query;
    } catch (error) {
      throw new DatabaseException('Failed to search documents', { originalError: error.message });
    }
  }
}