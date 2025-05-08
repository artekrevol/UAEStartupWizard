#!/bin/bash
# Script to deploy the minimal version

echo "================================================="
echo "  UAE Business Setup Assistant - Minimal Deploy"
echo "================================================="
echo ""
echo "This script helps you deploy a minimal version"
echo "that will work on Replit without Playwright issues"
echo ""

# Check if the minimal deploy directory exists
if [ ! -d "minimal-deploy" ]; then
  echo "❌ Error: minimal-deploy directory not found"
  exit 1
fi

# Navigate to minimal deploy directory
cd minimal-deploy

# Run the build script
echo "🏗️ Building the minimal deployment version..."
node build.js

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "To deploy this minimal version on Replit:"
echo ""
echo "Option 1: Deploy from this directory"
echo "--------------------------------"
echo "1. Create a new Replit project"
echo "2. Upload all files from the 'minimal-deploy' directory"
echo "3. Click 'Run' to test locally"
echo "4. Click 'Deploy' to deploy"
echo ""
echo "Option 2: Deploy to a separate repository"
echo "--------------------------------"
echo "1. Create a new Git repository with these files"
echo "2. Connect your Replit account to that repository"
echo "3. Deploy from the connected repository"
echo ""
echo "The minimal version contains:"
echo "- A simple Express server (index.js)"
echo "- A static frontend (public/index.html)"
echo "- No Playwright dependencies"
echo "- All required directories for Replit deployment"
echo ""