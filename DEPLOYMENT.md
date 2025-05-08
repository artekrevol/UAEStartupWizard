# Deployment Guide for UAE Business Setup Application

This document provides the necessary steps for deploying the UAE Business Setup microservices application in a production environment.

## Pre-Deployment Checklist

Before deploying, ensure you have:

1. Run the pre-deployment script to prepare the application:
   ```
   node scripts/pre-deploy.js
   ```

2. Verify the HTTP-only mode is working with:
   ```
   node test-http-only-mode.js
   ```
   You should see "Success: No browser-based scrapers available in HTTP-only mode" in the output.

3. Set up the required environment variables in your Replit Secrets panel:
   - `JWT_SECRET`: Secret key for JWT authentication
   - `DATABASE_URL`: PostgreSQL database connection string
   - `REDIS_URL`: Redis connection string (optional, will use memory cache fallback if not provided)
   - `SERVICE_AUTH_KEY`: Secret key for service-to-service authentication

4. Enable "Always On" in your project settings to keep microservices running continuously

## Deployment Process

### 1. Using Replit Deployment

Follow these steps to deploy your application:

1. Run our custom deployment script to prepare the build:
   ```
   node scripts/deploy.js
   ```

2. Click the "Deploy" button in your Replit project
3. Wait for the build process to complete
4. Your application will be available at your `.replit.app` domain

The custom deployment script handles:
- Setting up environment variables with fallbacks
- Configuring HTTP-only mode for scrapers
- Removing Playwright browser dependencies
- Using a production-optimized server entry point with enhanced error handling

### 2. HTTP-Only Mode

This application has been designed to work in HTTP-only mode for deployment environments that don't support browser automation. This mode is automatically enabled in production environments through the `.env.production` configuration.

### 3. Environment Configuration

The application uses the following configuration sources in order of precedence:
1. Replit Secrets (highest priority)
2. Environment variables in your deployment environment
3. `.env.production` file values
4. Default fallback values (lowest priority)

### 4. Memory Cache Fallback

If Redis is not available in your deployment environment, the application will automatically fall back to using in-memory caching. While this is less performant at scale, it ensures the application continues to function.

### 5. Verifying Deployment

After deployment, verify the following endpoints are functioning:

- `/api/health`: Should return a 200 status with service health information
- `/api/user`: Should return a 401, indicating authentication is working
- `/api/free-zones`: Should return a list of free zones

### 6. Deployment Architecture

This application uses a microservices architecture with the following components:

- API Gateway: Entry point for all client requests
- User Service: Handles authentication and user management
- Document Service: Manages document storage and retrieval
- Free Zone Service: Provides information about UAE free zones
- Scraper Service: Collects data from external sources
- AI Research Service: Provides AI-powered research capabilities

### 7. Troubleshooting

If you encounter deployment issues:

1. Check the Replit logs for specific error messages
2. Verify all required secrets are set in the Replit Secrets panel
3. Ensure "Always On" is enabled to maintain persistent connections
4. Check that HTTP-only mode is properly configured for scrapers
5. If experiencing TypeScript errors, confirm the API Gateway is using the fixed performance middleware

### 8. Maintenance

Regular maintenance tasks:

1. Update any external service credentials as needed
2. Monitor database storage usage
3. Periodically check the cache status at `/api/admin/cache/stats` (admin access required)
4. Review performance monitoring data to optimize slow endpoints

For any issues or questions regarding deployment, please contact the development team.