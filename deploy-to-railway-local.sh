#!/bin/bash

# Railway Local Deployment Script
# This script helps you deploy the application to Railway locally

# Output colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Railway Local Deployment (HTTP-only mode) ===${NC}"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo -e "${RED}ERROR: Railway CLI is not installed.${NC}"
  echo "Install it using: npm i -g @railway/cli"
  exit 1
else
  echo -e "${GREEN}Railway CLI is installed ✓${NC}"
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
  echo -e "${RED}ERROR: Not logged in to Railway.${NC}"
  echo "Please run: railway login"
  exit 1
else
  echo -e "${GREEN}Logged in to Railway ✓${NC}"
fi

# Set environment variables
echo -e "${BLUE}Setting up environment variables...${NC}"
echo "Setting Railway environment variables..."

# Generate JWT SECRET if not provided
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  echo -e "${YELLOW}Generated new JWT_SECRET${NC}"
fi

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}ERROR: DATABASE_URL environment variable is not set.${NC}"
  echo "Please set the DATABASE_URL environment variable and run again:"
  echo "export DATABASE_URL=<your_database_url>"
  exit 1
else
  echo -e "${GREEN}DATABASE_URL is set ✓${NC}"
fi

# Set environment variables in Railway
echo "Setting Railway environment variables..."
railway variables set \
  JWT_SECRET="$JWT_SECRET" \
  DATABASE_URL="$DATABASE_URL" \
  NODE_ENV=production \
  SCRAPER_HTTP_ONLY_MODE=true \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
  USE_HTTP_ONLY_SCRAPER=true
  
if [ ! -z "$OPENAI_API_KEY" ]; then
  railway variables set OPENAI_API_KEY="$OPENAI_API_KEY"
  echo -e "${GREEN}OPENAI_API_KEY is set ✓${NC}"
else
  echo -e "${YELLOW}WARNING: OPENAI_API_KEY is not set. Some AI features may not work.${NC}"
fi

# Deploy the project
echo -e "${BLUE}Deploying to Railway...${NC}"
railway up

# Verify deployment
echo -e "${BLUE}Deployment completed!${NC}"
echo "Check your deployment status in the Railway dashboard"
railway open

echo -e "${GREEN}Deployment process completed!${NC}"
echo "Your application with HTTP-only mode has been deployed to Railway"