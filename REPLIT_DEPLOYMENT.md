# Replit Deployment Guide

This guide explains how to deploy the UAE Business Setup Assistant on Replit while avoiding issues with Playwright browser dependencies.

## Deployment Issues and Solutions

The application uses Playwright for some web scraping functionality, but this can cause deployment issues on Replit due to browser binary dependencies. To work around this, we've implemented a solution that:

1. Uses HTTP-only mode for all web scraping in production
2. Completely skips Playwright browser installation during deployment
3. Uses a production-optimized entry point

## Step-by-Step Deployment Instructions

### 1. Prepare for Deployment

Run our custom deployment preparation script that will:
- Set the necessary environment variables
- Create a browser-free build
- Configure HTTP-only mode for all scrapers

```bash
bash scripts/build-for-deployment.sh
```

### 2. Deploy on Replit

1. Click the "Deploy" button in your Replit project
2. Wait for the build and deployment process to complete
3. Your application will be available at your Replit deployment URL

## Verifying Deployment

After deployment, you can verify that the application is properly using HTTP-only mode for scraping by:

1. Checking the deployment logs for the message "Starting scraper in HTTP-only mode"
2. Confirming there are no Playwright-related errors in the logs
3. Testing the application's data retrieval functionality

## Troubleshooting

If you encounter deployment issues:

### Problem: Playwright Browser Installation Errors

**Solution**: Make sure you've run the deployment preparation script before deploying. This script sets all the necessary configurations to skip Playwright.

### Problem: Application Tries to Use Browser Features

**Solution**: Verify that the environment variables `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` and `SCRAPER_HTTP_ONLY_MODE=true` are properly set in your deployment.

### Problem: Missing Data in Production

**Solution**: The HTTP-only mode uses direct HTTP requests instead of browser automation. This may result in differences in the scraped data. Check the logs for any scraper errors and verify that the API endpoints being accessed are available and returning the expected data.

## Technical Details

### HTTP-Only Mode

In HTTP-only mode, the application:
- Uses direct HTTP requests via Axios instead of browser automation
- Falls back to mock data when direct HTTP requests fail (for development only)
- Implements more robust error handling for HTTP requests

### Environment Variables

The following environment variables are important for deployment:

- `NODE_ENV=production`: Enables production mode
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`: Prevents Playwright from downloading browser binaries
- `SCRAPER_HTTP_ONLY_MODE=true`: Forces all scrapers to use HTTP-only mode

These are automatically set by the deployment preparation script.