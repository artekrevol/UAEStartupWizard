#!/bin/bash
# Script to build a deployment version without Playwright

echo "====================================================="
echo "  UAE Business Setup Assistant - Deployment Builder  "
echo "====================================================="
echo ""
echo "This script builds a version of the application that:"
echo "1. Completely removes all Playwright dependencies"
echo "2. Uses HTTP-only scraper implementation"
echo "3. Creates a deployment-ready package"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

# Set environment variables for the build
export NODE_ENV=production
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export SCRAPER_HTTP_ONLY_MODE=true

echo "🏗️ Building deployment version without Playwright..."
node build-no-playwright.js

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "✅ Successfully created a Playwright-free deployment build!"
echo ""
echo "Your deployment build is located in the build-no-playwright directory."
echo "To deploy this version:"
echo "1. cd build-no-playwright"
echo "2. Use the Deploy button in Replit"
echo ""