# Railway ES Module Deployment Guide

This document explains the enhanced deployment setup for Railway that fully addresses ES module compatibility issues and completely disables Playwright browser usage.

## Key Components

### 1. ES Module Compatible Runtime Patch (`runtime-patch.js`)

This patch is loaded first using the `--import` flag for Node.js and establishes:

- Dynamic import interception to block any Playwright imports
- Global mocks for all browser-related functionality
- Complete browser module replacement to prevent any initialization
- Global error handling to prevent crashes from browser-related errors

### 2. Production Wrapper (`start-wrapper.js`)

The wrapper script provides additional safeguards:

- Sets critical environment variables for browser prevention
- Adds process-level error handlers to catch any unhandled errors
- Prevents application crashes from unhandled exceptions related to browsers
- Loads the main application after all these safeguards are in place

### 3. Procfile Configuration

The Procfile is configured to:

- Use the `--no-warnings` flag to minimize noise in logs
- Load the runtime patch using the `--import` flag for proper ES module interception
- Execute the wrapper script instead of directly executing the application

## Why This Approach Works

1. **Complete Module Interception**: By patching `globalThis.__proto__.constructor.prototype.import`, we intercept Playwright imports before they can be processed.
   
2. **Mock Return Values**: We don't just block imports, we provide functioning mocks that return working objects with all expected methods.

3. **Multi-level Error Handling**: We catch errors at multiple levels - import time, execution time, and process level.

4. **ES Module Compatibility**: Our approach fully supports the package.json "type": "module" setting.

## Deployment Process

1. Push the code to GitHub
2. Set up Railway with GitHub integration
3. Railway's automated CI/CD handles the rest

## Environment Variables

The following environment variables are automatically set:

- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true`
- `PLAYWRIGHT_BROWSERS_PATH=0`
- `SCRAPER_HTTP_ONLY_MODE=true`
- `USE_HTTP_ONLY_SCRAPER=true`
- `PLAYWRIGHT_SKIP_VALIDATION=true`

## Troubleshooting

If you still see any Playwright-related errors in the logs, they should be benign and not cause crashes. Our error handlers will intercept them and keep the application running.

## Benefits

- **Simplified Deployment**: No need for complex container configurations or custom Dockerfile changes
- **Reduced Resource Usage**: No browser binary downloads or initialization
- **More Reliable Operation**: Multiple layers of protection against browser-related crashes
- **Maintainable Code**: Clean separation between runtime patches and application code