#!/bin/bash
# Main deployment script for Replit

# Display header
echo "================================================="
echo "  UAE Business Setup Assistant - Replit Deploy"
echo "================================================="
echo ""
echo "This script prepares your application for deployment on Replit"
echo "by disabling Playwright and using HTTP-only mode for scrapers."
echo ""

# Run the deployment preparation script
echo "Starting deployment preparation..."
bash scripts/build-for-deployment.sh

# Check if the build was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment preparation complete!"
  echo ""
  echo "To deploy your application:"
  echo "1. Click the 'Deploy' button in Replit"
  echo "2. Your application will be deployed without Playwright dependencies"
  echo ""
  echo "For more details, see REPLIT_DEPLOYMENT.md"
else
  echo ""
  echo "❌ Deployment preparation failed"
  echo "Please check the logs above for errors"
  exit 1
fi