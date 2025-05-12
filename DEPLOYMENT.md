# UAE Business Setup Assistant - Deployment Guide

This guide explains how to deploy the UAE Business Setup Assistant without Playwright dependencies, making it more lightweight and easier to deploy to production environments.

## Why Remove Playwright?

Playwright is a powerful tool for browser automation and end-to-end testing, but it comes with significant drawbacks in production environments:

1. **Large Size**: Playwright includes browser binaries that can increase your application size by hundreds of megabytes
2. **Deployment Complexity**: Browser dependencies can cause issues in containerized or serverless environments
3. **Resource Usage**: Running headless browsers consumes significant CPU and memory resources
4. **Reliability**: Browser-based scraping is more fragile and prone to failures in production

## The Simplified HTTP-Only Solution

We've implemented a completely simplified HTTP-only solution that:

1. Replaces all browser-based scrapers with pure HTTP requests
2. Uses a minimal HTML parser without external dependencies
3. Completely removes all Playwright and other complex dependencies
4. Provides a clean, production-ready approach

## Building a Simplified Deployment Version

To create a deployment-ready version without complex dependencies:

```bash
# Run the simplified deployment build script
./build-simplified.sh
```

This script:
1. Sets necessary environment variables
2. Creates a clean build in the `build-no-playwright-v2` directory
3. Creates a simplified server implementation
4. Removes all complex dependencies (Playwright, cheerio, etc.)
5. Generates a deployment-ready package

## What's Included in the Build

The simplified deployment build includes:

- A streamlined package.json without complex dependencies
- A clean, simplified server entry point
- Ultra-lightweight HTTP-only implementations
- Environment configuration files for production
- Deployment scripts and utilities

## Deploying the Build

To deploy the application:

1. Navigate to the build directory:
   ```bash
   cd build-no-playwright-v2
   ```

2. Use the Replit Deploy button to deploy the application

3. The application will run in simplified HTTP-only mode, using only native Node.js modules

## Simplified vs. Full Implementation

Here's how the simplified implementation compares to the full development version:

| Feature | Simplified | Full Version |
|---------|-----------|--------------|
| **Size** | Ultra-lightweight (~1MB) | Heavy (~300MB+) |
| **Dependencies** | Minimal | Extensive |
| **Deployment** | Very simple | Complex |
| **Resources** | Minimal usage | High usage |
| **Functionality** | Core features | Advanced features |
| **Stability** | Extremely stable | Variable |

The simplified implementation focuses on core functionality with maximum stability for production environments.

## Troubleshooting

If you encounter issues with the deployment:

1. **Missing Features**: The simplified version intentionally removes some advanced features to ensure deployment reliability.

2. **API Errors**: Ensure all required API keys are properly set in your environment variables.

3. **Build Errors**: If the build fails, run `./build-simplified.sh` again or check the logs for specific errors.

## Environment Variables

The deployment requires the following environment variables:

- `NODE_ENV=production` (set automatically)
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (set automatically)
- `SCRAPER_HTTP_ONLY_MODE=true` (set automatically)
- `DATABASE_URL` (must be set manually)
- `OPENAI_API_KEY` (must be set manually)

## Notes for Development

When developing new features:

1. Develop using the full version with all features
2. Test compatibility with the simplified version before deployment
3. Keep advanced features in the development environment
4. Use feature flags to ensure graceful degradation in production