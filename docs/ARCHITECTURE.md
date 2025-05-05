# UAE Business Setup Assistant Architecture

## Overview

The UAE Business Setup Assistant is designed as a microservices architecture, dividing the application into smaller, loosely coupled services. This document provides a detailed look at the architecture, components, and interactions between services.

## Architecture Diagram

```
+-------------------+
|    Client Apps    |
|  (Web, Mobile)    |
+--------+----------+
         |
         v
+--------+----------+
|    API Gateway    |
|     (5000)        |
+--------+----------+
         |
         v
+----+------+------+------+------+
|    |      |      |      |      |
|    v      v      v      v      v
+----+--+ +-+----+ +----+-+ +---+---+ +---+---+
| User  | | Doc  | | Free | | AI    | |Scraper|
|Service| |Serv. | | Zone | |Research| |Service|
| (3001)| |(3002)| |(3003)| | (3004) | | (3005)|
+----+--+ +-+----+ +----+-+ +---+---+ +---+---+
     |       |          |        |         |
     |       |          |        |         |
     v       v          v        v         v
+----+-------+----------+--------+---------+
|           Message Broker               |
|            (RabbitMQ)                  |
+----------------+------------------------+
                 |
                 v
+----------------+------------------------+
|           PostgreSQL                   |
|     (Service-specific databases)       |
+----------------------------------------+
```

## Service Components

### 1. API Gateway (Port 5000)

**Responsibilities:**
- Single entry point for all API requests
- Request routing to appropriate microservices
- Authentication and authorization
- Rate limiting and security policies
- Response aggregation when needed

**Technologies:**
- Express.js
- JWT for authentication
- HTTP-Proxy-Middleware for routing

### 2. User Service (Port 3001)

**Responsibilities:**
- User registration and authentication
- User profile management
- Role-based access control
- Session management

**Key Endpoints:**
- POST /login - Authenticate user
- POST /register - Register new user
- GET /users - List users (admin)
- GET /users/:id - Get user profile

### 3. Document Service (Port 3002)

**Responsibilities:**
- Document upload and storage
- Document categorization and metadata
- Document retrieval and download
- Document template management

**Key Endpoints:**
- POST /upload - Upload new document
- GET / - List documents
- GET /:id - Get document details
- GET /:id/download - Download document

### 4. Freezone Service (Port 3003)

**Responsibilities:**
- Free zone information management
- Business activity data
- Comparative analysis between free zones
- Setup requirements for different entity types

**Key Endpoints:**
- GET /freezones - List all free zones
- GET /freezones/:id - Get free zone details
- GET /business-activities - List business activities
- POST /compare - Compare multiple free zones

### 5. AI Research Service (Port 3004)

**Responsibilities:**
- OpenAI integration for research
- Web research on business topics
- Conversational AI interface
- Research data storage and retrieval

**Key Endpoints:**
- POST /research - Submit research request
- GET /research/:id - Get research status/results
- POST /chat - Interact with AI assistant

### 6. Scraper Service (Port 3005)

**Responsibilities:**
- Web scraping of free zone websites
- Document downloading from external sources
- Scheduled data collection
- Data transformation and cleaning

**Key Endpoints:**
- POST /tasks - Create scraper task
- GET /tasks/:id - Get task status
- POST /schedule - Schedule recurring task

## Data Storage

### PostgreSQL Databases

Each service has its own database:

1. **User Service Database** (`user_db`)
2. **Document Service Database** (`document_db`)
3. **Freezone Service Database** (`freezone_db`)
4. **AI Research Service Database** (`ai_research_db`)
5. **Scraper Service Database** (`scraper_db`)

See `DATABASE_MIGRATION_STRATEGY.md` for database schema details.

## Communication Patterns

### Synchronous Communication

- REST APIs for direct service-to-service communication
- API Gateway handles routing and aggregation

### Asynchronous Communication

- Event-based messaging via RabbitMQ
- Services publish events when state changes
- Services subscribe to relevant events from other services

### Event Types

- **User Events**: user.created, user.updated, user.deleted
- **Document Events**: document.uploaded, document.updated, document.deleted
- **Freezone Events**: freezone.updated, business_activity.updated
- **Research Events**: research.requested, research.completed
- **Scraper Events**: scraper.task.created, scraper.task.completed, scraper.task.failed

## Security

- JWT-based authentication
- Service-to-service authentication via API keys
- Rate limiting on public endpoints
- Input validation on all endpoints
- Secure environment variables for sensitive data

## Deployment

### Docker Containerization

Each service is containerized using Docker:

- Lightweight Node.js base images
- Environment-specific configuration
- Volume mounting for persistent data

### Docker Compose

Services are orchestrated using Docker Compose for development and testing:

- Service discovery via Docker network
- Shared resources (database, message broker)
- Environment variable management

## Development Workflows

### Starting Services

Services can be started individually or all at once:

```bash
# Start a single service
./scripts/start-services.sh [gateway|user|document|freezone|ai|scraper]

# Start all services
./scripts/start-services.sh all
```

### Docker Operations

Docker operations are managed via a dedicated script:

```bash
# Start containers
./scripts/docker-ops.sh up

# Stop containers
./scripts/docker-ops.sh down

# View logs
./scripts/docker-ops.sh logs

# Build images
./scripts/docker-ops.sh build
```

## Future Enhancements

1. **Service Discovery** - Implement dynamic service discovery
2. **Circuit Breaking** - Add circuit breakers for service resilience
3. **Distributed Tracing** - Implement tracing for request flows
4. **API Versioning** - Support multiple API versions
5. **Caching** - Add Redis for caching frequently accessed data
