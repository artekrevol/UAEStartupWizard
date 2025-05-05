# UAE Business Setup Assistant

An AI-powered SaaS platform revolutionizing UAE business establishment through intelligent document enrichment and adaptive task management tools. The system dynamically processes free zone documentation with comprehensive insights and automated task tracking, leveraging advanced AI to streamline complex business workflows.

## Architecture Overview

The application follows a microservices architecture with the following components:

### Services

1. **API Gateway** - Central entry point for all client requests
   - Routes client requests to appropriate microservices
   - Handles authentication and authorization
   - Implements rate limiting and security policies

2. **User Management Service** - Handles user profiles and authentication
   - User registration and login
   - Profile management
   - Role-based access control

3. **Document Management Service** - Manages document operations
   - Document upload and storage
   - Document categorization and metadata
   - Document retrieval and download

4. **Freezone Data Service** - Provides information about UAE free zones
   - Free zone details and benefits
   - Business activity information
   - Comparative analysis of free zones

5. **AI Research Service** - Handles OpenAI integration and web research
   - Performs web research using OpenAI
   - Processes and analyzes research results
   - Provides AI chat capabilities

6. **Scraper Service** - Collects data from external sources
   - Scheduled web scraping tasks
   - Data collection and processing
   - Monitoring and error handling

### Infrastructure

- **Message Broker (RabbitMQ)** - Enables event-driven communication between services
- **Database (PostgreSQL)** - Persistent storage for service data
- **Docker** - Container platform for deployment

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- Node.js (for development)

### Development Setup

1. Clone the repository

```bash
git clone <repository-url>
cd <repository-directory>
```

2. Create environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the development server

```bash
npm run dev
```

### Production Deployment

1. Build and start the services

```bash
docker-compose up -d
```

2. Monitor the logs

```bash
docker-compose logs -f
```

## Key Technologies

- **Backend**: Node.js/Express
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React.js with dynamic AI-assisted UI
- **AI**: OpenAI GPT-4o integration
- **Containerization**: Docker and Docker Compose
- **Message Queue**: RabbitMQ

## Contributing

Please read the contribution guidelines before submitting a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
