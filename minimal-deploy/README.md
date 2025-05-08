# UAE Business Setup Assistant - Minimal Deployment Version

This is a simplified deployment version of the UAE Business Setup Assistant, created specifically to address Replit deployment issues with Playwright.

## What's Different About This Version?

This is a **minimal deployment-only version** that:
- Has ZERO dependencies on Playwright
- Uses a simplified server implementation 
- Contains only essential functionality
- Is optimized for deployment on Replit

## How to Deploy

1. First, build the application:
   ```
   node build.js
   ```

2. Run the application to test it:
   ```
   node index.js
   ```

3. If everything works locally, deploy using Replit's deploy button

## File Structure

- `index.js` - The main server file
- `build.js` - Build script to generate static files
- `package.json` - Minimal dependencies
- `public/` - Static files served by the application
- `screenshots/` - Required directory for compatibility

## Included Features

The minimal deployment version includes:
- Basic server functionality
- Simple frontend with UAE free zone information
- API status endpoint
- Required directories for Replit deployment

## Excluded Features

To ensure reliable deployment, this version excludes:
- Web scraping functionality (no Playwright)
- Database operations
- Complex backend features

This version should deploy successfully on Replit without any browser installation issues.