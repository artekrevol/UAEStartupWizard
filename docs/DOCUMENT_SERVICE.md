# Document Service

## Overview

The Document Service is a microservice responsible for managing all document-related operations in the UAE Business Hub platform. It provides a clean API for creating, retrieving, updating, and deleting documents, as well as specialized functionality for document processing, statistics, and user document management.

## Architecture

The Document Service follows a layered architecture:

1. **Controller Layer**: Handles HTTP requests and responses
2. **Repository Layer**: Manages data access and persistence
3. **Schema Layer**: Defines data models and validation rules
4. **Service Layer**: Implements business logic
5. **Event Layer**: Broadcasts document lifecycle events for inter-service communication

## Key Features

- Document CRUD operations with rich metadata
- Free zone specific document categorization
- Document search with filtering
- Document statistics by category and subcategory
- Document processing for specialized formats (DMCC documents)
- User document management
- Event broadcasting for cross-service consistency

## API Endpoints

| Method | Endpoint                       | Description                               | Auth      |
|--------|--------------------------------|-------------------------------------------|-----------|
| GET    | /documents                     | List all documents                        | Required  |
| GET    | /documents/:id                 | Get document by ID                        | Required  |
| POST   | /documents                     | Create a new document                     | Required  |
| PATCH  | /documents/:id                 | Update a document                         | Required  |
| DELETE | /documents/:id                 | Delete a document                         | Required  |
| GET    | /documents/public              | List public documents                     | Not Required |
| GET    | /documents/search              | Search documents                          | Required  |
| POST   | /documents/search              | Advanced document search                  | Required  |
| GET    | /documents/stats               | Get document statistics by category       | Required  |
| GET    | /documents/stats/subcategories | Get document statistics by subcategory    | Required  |
| GET    | /documents/process-dmcc        | Process DMCC documents                    | Required  |
| GET    | /documents/category/:categoryId | Get documents by category               | Required  |
| POST   | /documents/upload              | Upload a new document                     | Required  |
| POST   | /documents/batch-upload        | Upload multiple documents                 | Required  |
| GET    | /documents/user-documents/:id  | Get user document by ID                   | Required  |
| GET    | /documents/user-documents/user/:userId | Get documents by user ID         | Required  |
| POST   | /documents/user-documents      | Create a user document                    | Required  |

## Event Broadcasting

The Document Service broadcasts the following events:

- `document-created`: When a new document is created
- `document-updated`: When a document is updated
- `document-deleted`: When a document is deleted
- `document-processing-started`: When document processing begins
- `document-processing-completed`: When document processing completes
- `document-processing-failed`: When document processing fails

## Data Models

### Document

```typescript
interface Document {
  id: number;
  title: string;
  filename: string;
  filePath: string;
  fileSize: number | null;
  documentType: string | null;
  category: string | null;
  subcategory: string | null;
  content: string | null;
  freeZoneId: number | null;
  metadata: Record<string, any> | null;
  uploadedAt: Date;
  status: string | null;
  isPublic: boolean;
  tags: string[] | null;
  lastUpdated: Date | null;
}
```

### UserDocument

```typescript
interface UserDocument {
  id: number;
  userId: number;
  title: string;
  filename: string | null;
  filePath: string | null;
  fileSize: number | null;
  documentType: string | null;
  category: string | null;
  status: string | null;
  uploadedAt: Date;
  expiresAt: Date | null;
  metadata: Record<string, any> | null;
  lastUpdated: Date | null;
}
```

## Implementation Details

### Controller Implementation

The document controller implements RESTful endpoints for all document operations. It handles:
- Request validation
- Authentication checks 
- File uploads
- Response formatting
- Event broadcasting

### Repository Implementation

The repository layer provides database access through Drizzle ORM, with methods for:
- CRUD operations
- Search functionality
- Statistics generation
- User document management

### Event System

The service uses the EventBus to broadcast events when documents are created, updated, or deleted. This enables other services to react to document changes:

```typescript
// When a document is created
eventBus.publish('document-created', {
  documentId: document.id,
  title: document.title,
  category: document.category,
  // Other metadata...
  createdAt: new Date().toISOString()
});
```

## Service Integration

The Document Service communicates with other services:

1. **API Gateway**: Routes all document requests 
2. **User Service**: Consumes document events to update user statistics and notifications
3. **AI Service**: Consumes document events to update search indexes
4. **Frontend**: Consumes document APIs for display and management

## Security Considerations

1. **Authentication**: All non-public endpoints require JWT authentication
2. **Authorization**: Document access is restricted based on user roles
3. **Input Validation**: All inputs are validated using Zod schemas
4. **Error Handling**: Standardized error responses with appropriate HTTP status codes
5. **Rate Limiting**: API gateway enforces rate limits on document endpoints

## Future Enhancements

1. **Document Versioning**: Track document changes over time
2. **Advanced Search**: Full-text search with AI-powered relevance scoring
3. **Document Content Extraction**: Extract structured data from document content
4. **Approval Workflows**: Support for document approval processes
5. **Access Controls**: More granular permissions for document access