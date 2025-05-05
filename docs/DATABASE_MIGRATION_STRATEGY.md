# Database Migration Strategy

## Overview

This document outlines the strategy for migrating the existing monolithic database to a microservices-oriented database architecture.

## Current State

The current database is a single PostgreSQL instance with tables for all application functions:

- `users` - User accounts and authentication
- `free_zones` - Free zone information
- `business_activities` - Business activities and categories
- `documents` - Document storage metadata
- `business_setup` - Business setup tracking
- ... and more related tables

## Target State

In the microservices architecture, each service has its own database:

1. **User Service Database** (`user_db`)
   - `users` - User accounts and authentication
   - `user_profiles` - Extended user information
   - `roles` - User roles and permissions

2. **Document Service Database** (`document_db`)
   - `documents` - Document metadata
   - `user_documents` - User-specific documents
   - `document_templates` - Document templates
   - `template_submissions` - User submissions for templates
   - `document_types` - Document type reference data

3. **Freezone Service Database** (`freezone_db`)
   - `free_zones` - Free zone information
   - `business_activities` - Business activities 
   - `business_activity_categories` - Categories for business activities
   - `establishment_guides` - Process guides for different entity types

4. **AI Research Service Database** (`ai_research_db`)
   - `ai_training_data` - Training data for AI models
   - `research_topics` - Research topics and results
   - `web_research_items` - Web research data
   - `conversations` - Chat conversations
   - `messages` - Individual messages from conversations
   - `assistant_memory` - Memory for AI assistants

5. **Scraper Service Database** (`scraper_db`)
   - `scraper_tasks` - Tasks for web scraping
   - `scraper_results` - Results from scraping operations
   - `scraper_schedules` - Scheduling for recurring scraping
   - `activity_logs` - Activity logging for scraper operations

## Migration Strategy

### Phase 1: Database Schema Separation

1. **Create New Databases**
   - Create the five separate databases within PostgreSQL
   - Implement schemas in each database based on the service's needs

2. **Review Data Dependencies**
   - Identify cross-service data requirements
   - Design appropriate foreign key relationships or references

### Phase 2: Data Migration

1. **Initial Data Copy**
   - Copy existing data to the appropriate service databases
   - Ensure data integrity during the copy process

2. **Data Transformation**
   - Transform data as needed to fit the new schema structure
   - Update references between tables across different databases

### Phase 3: Dual-Write Period

1. **Implement Dual-Write**
   - Write to both old and new databases during transition
   - Verify data consistency between systems

2. **Read Migration**
   - Gradually switch read operations to the new databases
   - Monitor performance and correctness

### Phase 4: Cut-Over

1. **Service Cut-Over**
   - Switch each service to use only its dedicated database
   - Remove dual-write mechanisms

2. **Legacy Database Retirement**
   - Archive the legacy database
   - Eventually decommission after verification period

## Technical Implementation

### Database Connection Management

Each service has its own connection string for its database:

```
DATABASE_URL_USER_SERVICE=postgres://postgres:password@postgres:5432/user_db
DATABASE_URL_DOCUMENT_SERVICE=postgres://postgres:password@postgres:5432/document_db
DATABASE_URL_FREEZONE_SERVICE=postgres://postgres:password@postgres:5432/freezone_db
DATABASE_URL_AI_RESEARCH_SERVICE=postgres://postgres:password@postgres:5432/ai_research_db
DATABASE_URL_SCRAPER_SERVICE=postgres://postgres:password@postgres:5432/scraper_db
```

### Schema Management

- Use Drizzle ORM for schema definition and migrations
- Maintain schema files within each service repository
- Implement service-specific migration scripts

### Data Consistency

- Use event-driven architecture to maintain data consistency across services
- Implement eventual consistency where appropriate
- Provide compensating transactions for failure cases

## Rollback Plan

In case of migration issues:

1. Revert services to use the legacy database
2. Fix issues in the new database structure
3. Attempt migration again with fixes

## Timeline

- **Week 1**: Setup service-specific databases and schemas
- **Week 2**: Implement data migration scripts
- **Week 3**: Dual-write implementation and testing
- **Week 4**: Service cut-over and verification
- **Week 5**: Monitoring and optimization
