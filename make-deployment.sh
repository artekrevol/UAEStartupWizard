#!/bin/bash
# Script to build a Playwright-free deployment version

echo "================================================="
echo "  UAE Business Setup Assistant - Deployment Build"
echo "================================================="
echo ""
echo "This script builds a deployment version without Playwright"
echo ""

# Run the build script
node build-deployment.js

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment build complete!"
  echo ""
  echo "Instructions:"
  echo "1. cd build-deployment"
  echo "2. Click the Deploy button in Replit"
  echo ""
  echo "This version completely removes Playwright and uses"
  echo "HTTP-only requests for scraping functionality."
else
  echo "❌ Build failed. Please check the error messages above."
  exit 1
fi