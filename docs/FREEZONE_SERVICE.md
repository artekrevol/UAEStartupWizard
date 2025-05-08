# Free Zone Service

## Overview

The Free Zone Service is a microservice responsible for managing all free zone-related data in the UAE Business Hub platform. It provides a clean API for creating, retrieving, updating, and deleting free zone information, as well as specialized functionality for business activities, license types, and free zone comparisons.

## Architecture

The Free Zone Service follows a layered architecture:

1. **Controller Layer**: Handles HTTP requests and responses
2. **Repository Layer**: Manages data access and persistence
3. **Schema Layer**: Defines data models and validation rules
4. **Event Layer**: Handles cross-service communication via events
5. **Service Layer**: Implements business logic

## Key Features

- Free Zone CRUD operations with rich metadata
- Business activity categories management
- License types and fees information
- Free zone comparison functionality
- Free zone reviews and ratings
- Event-driven updates from scrapers and document service

## API Endpoints

| Method | Endpoint                        | Description                              | Auth      |
|--------|--------------------------------|------------------------------------------|-----------|
| GET    | /freezones                      | List all free zones                      | Optional  |
| GET    | /freezones/:id                  | Get free zone by ID                      | Optional  |
| GET    | /freezones/slug/:slug           | Get free zone by slug                    | Optional  |
| POST   | /freezones                      | Create a new free zone                   | Required  |
| PUT    | /freezones/:id                  | Update a free zone                       | Required  |
| DELETE | /freezones/:id                  | Delete a free zone                       | Required  |
| GET    | /business-categories            | List all business categories             | Optional  |
| GET    | /business-categories/:id        | Get business category by ID              | Optional  |
| POST   | /business-categories            | Create a new business category           | Required  |
| PUT    | /business-categories/:id        | Update a business category               | Required  |
| DELETE | /business-categories/:id        | Delete a business category               | Required  |
| GET    | /license-types                  | List all license types                   | Optional  |
| GET    | /license-types/:id              | Get license type by ID                   | Optional  |
| GET    | /incentives                     | List all free zone incentives            | Optional  |
| GET    | /incentives/:id                 | Get incentive by ID                      | Optional  |
| GET    | /reviews                        | Get reviews for free zones               | Optional  |
| POST   | /reviews                        | Create a new review                      | Required  |
| GET    | /comparisons                    | Get saved comparisons                    | Required  |
| POST   | /comparisons                    | Save a new comparison                    | Required  |

## Event System

The Free Zone Service publishes and subscribes to the following events:

**Published Events**:
- `freezone-created`: When a new free zone is created
- `freezone-updated`: When a free zone is updated
- `freezone-deleted`: When a free zone is deleted
- `freezone-stats-updated`: When free zone statistics are updated
- `freezone-data-refreshed`: When free zone data is refreshed from external sources

**Subscribed Events**:
- `document-created`: When a new document related to a free zone is created
- `document-updated`: When a document related to a free zone is updated
- `document-deleted`: When a document related to a free zone is deleted
- `scraper-freezone-data-updated`: When the scraper service updates free zone data

## Data Models

### FreeZone

```typescript
interface FreeZone {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  benefits: Record<string, any> | null;
  requirements: Record<string, any> | null;
  industries: Record<string, any> | null;
  licenseTypes: Record<string, any> | null;
  facilities: Record<string, any> | null;
  website: string | null;
  setupCost: Record<string, any> | null;
  faqs: Record<string, any> | null;
  lastUpdated: Date | null;
  status: string | null;
  logoUrl: string | null;
  contactInfo: Record<string, any> | null;
  officeLocations: Record<string, any> | null;
  establishmentYear: number | null;
  featuredImageUrl: string | null;
  slug: string | null;
  isPromoted: boolean;
}
```

### BusinessActivityCategory

```typescript
interface BusinessActivityCategory {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
  level: number | null;
  isActive: boolean;
  freeZoneId: number | null;
  createdAt: Date;
  updatedAt: Date | null;
}
```

### BusinessActivity

```typescript
interface BusinessActivity {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  activityCode: string | null;
  feeStructure: Record<string, any> | null;
  requirements: Record<string, any> | null;
  isAllowedInMainland: boolean;
  isAllowedInFreeZone: boolean;
  freeZoneId: number | null;
  createdAt: Date;
  updatedAt: Date | null;
}
```

### FreeZoneIncentive

```typescript
interface FreeZoneIncentive {
  id: number;
  freeZoneId: number | null;
  name: string;
  description: string | null;
  category: string | null;
  validityPeriod: string | null;
  eligibility: string | null;
  applicationProcess: string | null;
  termsAndConditions: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
```

### FreeZoneReview

```typescript
interface FreeZoneReview {
  id: number;
  freeZoneId: number;
  userId: number;
  rating: number;
  title: string | null;
  content: string | null;
  pros: string[] | null;
  cons: string[] | null;
  verificationStatus: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  helpfulCount: number | null;
  reportCount: number | null;
  isVisible: boolean;
}
```

## Implementation Details

### Controller Implementation

The free zone controller implements RESTful endpoints for all free zone operations. It handles:
- Request validation
- Authentication checks 
- Response formatting
- Event broadcasting

### Repository Implementation

The repository layer provides database access through Drizzle ORM, with methods for:
- CRUD operations
- Search functionality
- Statistics generation
- Free zone comparison

### Event Handling

The service uses the EventBus to broadcast events and receive events from other services:

```typescript
// When a free zone is updated
eventBus.publish('freezone-updated', {
  freeZoneId: freezone.id,
  name: freezone.name,
  updatedAt: new Date().toISOString()
});
```

## Service Integration

The Free Zone Service communicates with other services:

1. **API Gateway**: Routes all free zone requests 
2. **Document Service**: Provides documents related to free zones
3. **Scraper Service**: Updates free zone data from external sources
4. **User Service**: Provides user information for reviews and permissions
5. **Frontend**: Consumes free zone APIs for display and management

## Security Considerations

1. **Authentication**: Admin-only endpoints require JWT authentication
2. **Authorization**: Free zone modifications restricted to admin users
3. **Input Validation**: All inputs validated using Zod schemas
4. **Error Handling**: Standardized error responses with appropriate HTTP status codes
5. **Rate Limiting**: API gateway enforces rate limits on free zone endpoints

## Future Enhancements

1. **Advanced Search**: Implement full-text search for free zones and business activities
2. **Real-time Updates**: Provide WebSocket support for real-time free zone updates
3. **Geospatial Features**: Add mapping and location-based services
4. **Market Intelligence**: Add competitive analysis and market trends
5. **Personalization**: Provide personalized free zone recommendations based on user preferences