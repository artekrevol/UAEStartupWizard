#!/bin/bash
# Script to build a simplified deployment version without Playwright or other complex dependencies

echo "====================================================="
echo "  UAE Business Setup Assistant - Simplified Builder  "
echo "====================================================="
echo ""
echo "This script builds a version of the application that:"
echo "1. Completely removes all Playwright dependencies"
echo "2. Uses a simplified HTTP-only implementation"
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

echo "🏗️ Building simplified deployment version..."
node build-no-playwright-v2.js

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "✅ Successfully created a simplified deployment build!"
echo ""
echo "Your deployment build is located in the build-no-playwright-v2 directory."
echo "To deploy this version:"
echo "1. cd build-no-playwright-v2"
echo "2. Use the Deploy button in Replit"
echo ""