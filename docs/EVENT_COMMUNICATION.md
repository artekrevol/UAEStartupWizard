# Document Service Event Communication

This document outlines the event-based communication system for the Document Service microservice.

## Overview

The Document Service broadcasts events about document lifecycle activities to other services. This enables loose coupling between services while maintaining data consistency across the system.

## Event Types

### Document Lifecycle Events

- **document-created**: Broadcast when a new document is created
- **document-updated**: Broadcast when a document is updated
- **document-deleted**: Broadcast when a document is deleted

### Document Processing Events

- **document-processing-started**: Broadcast when document processing begins (e.g., DMCC documents)
- **document-processing-completed**: Broadcast when document processing completes successfully
- **document-processing-failed**: Broadcast when document processing encounters an error

## Event Payload Structure

### Document Lifecycle Events

```typescript
// document-created event
{
  documentId: number;
  title: string;
  category: string | null;
  subcategory: string | null;
  freeZoneId: number | null;
  documentType: string | null;
  createdAt: string; // ISO date string
}

// document-updated event
{
  documentId: number;
  title: string;
  category: string | null;
  subcategory: string | null;
  freeZoneId: number | null;
  documentType: string | null;
  updatedAt: string; // ISO date string
}

// document-deleted event
{
  documentId: number;
  title: string;
  category: string | null;
  subcategory: string | null;
  freeZoneId: number | null;
  deletedAt: string; // ISO date string
}
```

### Document Processing Events

```typescript
// document-processing-started event
{
  type: string; // e.g., 'dmcc'
  startedAt: string; // ISO date string
}

// document-processing-completed event
{
  type: string; // e.g., 'dmcc'
  documentsAdded: number;
  completedAt: string; // ISO date string
}

// document-processing-failed event
{
  type: string; // e.g., 'dmcc'
  error: string;
  failedAt: string; // ISO date string
}
```

## Services Consuming Events

The following services consume document events:

1. **User Service**: Updates user activities, sends notifications, and maintains document relations
2. **AI Service**: Updates document indexes for search and analysis
3. **Dashboard Service**: Updates real-time statistics and charts
4. **Notification Service**: Sends emails, in-app notifications, or webhooks

## Implementation Example

### Broadcasting Events (Document Service)

```typescript
// In documentController.ts:

// When creating a document
const document = await documentRepo.createDocument(data);
eventBus.publish('document-created', {
  documentId: document.id,
  title: document.title,
  category: document.category,
  subcategory: document.subcategory,
  freeZoneId: document.freeZoneId,
  documentType: document.documentType,
  createdAt: new Date().toISOString()
});
```

### Consuming Events (User Service)

```typescript
// In documentEventHandler.ts:

// Register event handlers
eventBus.subscribe('document-created', this.handleDocumentCreated.bind(this));

// Handler implementation
private async handleDocumentCreated(data: any): Promise<void> {
  try {
    logger.info(`Document created: ${data.documentId} - ${data.title}`);
    
    // Update user's recent activities
    // Send notifications
    // Update dashboard statistics
  } catch (error) {
    logger.error('Error handling document created event', {
      error: error.message,
      documentId: data.documentId
    });
  }
}
```

## Benefits

1. **Loose Coupling**: Services don't need direct knowledge of each other
2. **Scalability**: Easy to add new consumers without modifying the publisher
3. **Resilience**: Failure in one service doesn't affect others
4. **Extensibility**: Easy to add new event types or modify existing ones

## Future Enhancements

1. **Message Persistence**: Store events in a durable queue
2. **Event Versioning**: Support for evolving event schemas
3. **Event Replay**: Ability to replay events for new services
4. **Dead Letter Queue**: Handle failed event processing