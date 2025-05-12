# UAE Business Setup Assistant - Deployment Guide

This guide explains how to deploy the UAE Business Setup Assistant without Playwright dependencies, making it more lightweight and easier to deploy to production environments.

## Why Remove Playwright?

Playwright is a powerful tool for browser automation and end-to-end testing, but it comes with significant drawbacks in production environments:

1. **Large Size**: Playwright includes browser binaries that can increase your application size by hundreds of megabytes
2. **Deployment Complexity**: Browser dependencies can cause issues in containerized or serverless environments
3. **Resource Usage**: Running headless browsers consumes significant CPU and memory resources
4. **Reliability**: Browser-based scraping is more fragile and prone to failures in production

## The HTTP-Only Solution

We've implemented a complete HTTP-only solution that:

1. Replaces all browser-based scrapers with pure HTTP requests
2. Uses cheerio for HTML parsing instead of browser DOM manipulation
3. Completely removes all Playwright dependencies
4. Provides fallback mechanisms for robust operation in production

## Building a Playwright-free Deployment Version

To create a deployment-ready version without Playwright:

```bash
# Run the deployment build script
./build-deployment.sh
```

This script:
1. Sets necessary environment variables
2. Creates a clean build in the `build-no-playwright` directory
3. Filters out all Playwright-related dependencies
4. Creates production-ready configuration files
5. Sets up HTTP-only mode for all scrapers

## What's Included in the Build

The deployment build includes:

- A modified package.json without Playwright dependencies
- A production-specific server entry point
- HTTP-only implementations of all scrapers
- Environment configuration files for production
- Deployment scripts and utilities

## Deploying the Build

To deploy the application:

1. Navigate to the build directory:
   ```bash
   cd build-no-playwright
   ```

2. Use the Replit Deploy button to deploy the application

3. The application will run in HTTP-only mode, using the lightweight implementation without any browser dependencies

## HTTP-Only vs. Browser-Based Scrapers

Here's how the HTTP-only implementation compares to the browser-based approach:

| Feature | HTTP-Only | Browser-Based |
|---------|-----------|--------------|
| **Size** | Lightweight (~1-5MB) | Heavy (~300MB+) |
| **Deployment** | Simple | Complex |
| **Resources** | Low usage | High usage |
| **JavaScript Execution** | No | Yes |
| **Complex Interaction** | Limited | Full |
| **Stability** | More stable | Less stable |

The HTTP-only implementation provides all the essential functionality while being more deployment-friendly.

## Troubleshooting

If you encounter issues with the deployment:

1. **Missing Data**: Some websites might require JavaScript execution. In production, the application uses pre-scraped data to mitigate this limitation.

2. **API Errors**: Ensure all required API keys are properly set in your environment variables.

3. **Build Errors**: If the build fails, check the logs for specific errors. Make sure you have Node.js installed.

## Environment Variables

The deployment requires the following environment variables:

- `NODE_ENV=production` (set automatically)
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (set automatically)
- `SCRAPER_HTTP_ONLY_MODE=true` (set automatically)
- `DATABASE_URL` (must be set manually)
- `OPENAI_API_KEY` (must be set manually)

## Notes for Development

When developing new features:

1. Always maintain HTTP-only alternatives to browser-based scrapers
2. Test both implementations before committing changes
3. Keep the browser-based implementation for development only
4. Use feature flags to control which implementation is used