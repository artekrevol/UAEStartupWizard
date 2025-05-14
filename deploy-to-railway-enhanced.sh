#!/bin/bash

# Enhanced Railway Deployment Script with Improved Error Handling and Variable Checking
# This script deploys the application to Railway with the HTTP-only scraper option
# for broader compatibility

# Output colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check environment variables
check_env_vars() {
  local missing_vars=0
  
  echo -e "${BLUE}Checking required environment variables...${NC}"
  
  # Check JWT_SECRET
  if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}ERROR: JWT_SECRET environment variable is not set.${NC}"
    echo "Run: export JWT_SECRET=<your_jwt_secret>"
    missing_vars=1
  else
    echo -e "${GREEN}JWT_SECRET is set ✓${NC}"
  fi
  
  # Check DATABASE_URL
  if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set.${NC}"
    echo "Run: export DATABASE_URL=<your_database_url>"
    missing_vars=1
  else
    echo -e "${GREEN}DATABASE_URL is set ✓${NC}"
  fi
  
  # Check OPENAI_API_KEY
  if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}WARNING: OPENAI_API_KEY environment variable is not set.${NC}"
    echo "Some AI features may not work correctly."
    echo "Run: export OPENAI_API_KEY=<your_openai_api_key>"
  else
    echo -e "${GREEN}OPENAI_API_KEY is set ✓${NC}"
  fi
  
  if [ $missing_vars -eq 1 ]; then
    echo -e "${RED}Missing required environment variables. Please set them and try again.${NC}"
    return 1
  fi
  
  echo -e "${GREEN}All required environment variables are set!${NC}"
  return 0
}

# Function to check if Railway CLI is installed
check_railway_cli() {
  if ! command -v railway &> /dev/null; then
    echo -e "${RED}ERROR: Railway CLI is not installed.${NC}"
    echo "Install it using: npm i -g @railway/cli"
    return 1
  else
    echo -e "${GREEN}Railway CLI is installed ✓${NC}"
    return 0
  fi
}

# Function to check Railway login status
check_railway_login() {
  if ! railway whoami &> /dev/null; then
    echo -e "${RED}ERROR: Not logged in to Railway.${NC}"
    echo "Please run: railway login"
    return 1
  else
    echo -e "${GREEN}Logged in to Railway ✓${NC}"
    return 0
  fi
}

# Function to build the project
build_project() {
  echo -e "${BLUE}Building project for deployment...${NC}"
  
  # Run the build command with error handling
  if npm run build-no-playwright && node fix-cheerio-import.js; then
    echo -e "${GREEN}Build completed successfully! ✓${NC}"
    return 0
  else
    echo -e "${RED}ERROR: Build failed. Please check the error messages above.${NC}"
    return 1
  fi
}

# Function to deploy to Railway
deploy_to_railway() {
  echo -e "${BLUE}Deploying to Railway...${NC}"
  
  # Set environment variables for Railway
  echo "Setting Railway environment variables..."
  railway variables set JWT_SECRET="$JWT_SECRET" DATABASE_URL="$DATABASE_URL" NODE_ENV=production SCRAPER_HTTP_ONLY_MODE=true PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
  
  if [ ! -z "$OPENAI_API_KEY" ]; then
    railway variables set OPENAI_API_KEY="$OPENAI_API_KEY"
  fi
  
  # Deploy the project
  if railway up; then
    echo -e "${GREEN}Deployment to Railway completed successfully! ✓${NC}"
    
    # Get the deployment URL
    RAILWAY_URL=$(railway service open --url)
    echo -e "${GREEN}Your application is deployed at: ${RAILWAY_URL}${NC}"
    return 0
  else
    echo -e "${RED}ERROR: Deployment to Railway failed. Please check the error messages above.${NC}"
    return 1
  fi
}

# Function to verify deployment
verify_deployment() {
  echo -e "${BLUE}Verifying deployment...${NC}"
  
  # Get the deployment URL
  RAILWAY_URL=$(railway service open --url)
  if [ -z "$RAILWAY_URL" ]; then
    echo -e "${YELLOW}WARNING: Could not retrieve the deployment URL.${NC}"
    echo "Please check your Railway dashboard for the deployment URL."
    return 1
  fi
  
  # Check health endpoint
  echo "Checking health endpoint..."
  if curl -s "${RAILWAY_URL}/health" | grep -q "status.*ok"; then
    echo -e "${GREEN}Health endpoint check passed ✓${NC}"
    echo -e "${GREEN}Your application is successfully deployed and running!${NC}"
    echo -e "${GREEN}Deployment URL: ${RAILWAY_URL}${NC}"
    return 0
  else
    echo -e "${RED}ERROR: Health endpoint check failed.${NC}"
    echo "It may take a few minutes for the application to fully start up."
    echo "Please try again in a few minutes or check the Railway logs for errors."
    return 1
  fi
}

# Main function
main() {
  echo -e "${BLUE}=== Enhanced Railway Deployment (HTTP-only mode) ===${NC}"
  
  # Check requirements
  check_railway_cli || exit 1
  check_railway_login || exit 1
  check_env_vars || exit 1
  
  # Build and deploy
  build_project || exit 1
  deploy_to_railway || exit 1
  
  # Give the deployment a moment to initialize
  echo "Waiting 30 seconds for deployment to initialize..."
  sleep 30
  
  # Verify deployment
  verify_deployment
  
  echo -e "${BLUE}=== Deployment process completed ===${NC}"
}

# Run the main function
main