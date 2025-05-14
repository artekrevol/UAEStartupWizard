#!/bin/bash
# Revised Railway Deployment Script with Better Error Handling
# Version 2.0

echo "================================================"
echo "Revised Railway Deployment - UAE Business Setup Assistant"
echo "================================================"

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if railway CLI is installed
echo -e "${YELLOW}[Step 1/10]${NC} Checking for Railway CLI..."
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
    npm i -g @railway/cli
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install Railway CLI. Please install it manually with 'npm i -g @railway/cli'.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Railway CLI installed successfully.${NC}"
else
    echo -e "${GREEN}Railway CLI found. Continuing...${NC}"
fi

# Step 2: Login to Railway
echo -e "\n${YELLOW}[Step 2/10]${NC} Logging in to Railway..."
railway login
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to login to Railway. Please try again.${NC}"
    exit 1
fi
echo -e "${GREEN}Successfully logged in to Railway.${NC}"

# Step 3: Link to existing project or create new one
echo -e "\n${YELLOW}[Step 3/10]${NC} Setting up Railway project..."
railway link
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Couldn't link to existing project. Creating a new one...${NC}"
    railway project create
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create a new project. Please try again.${NC}"
        exit 1
    fi
    echo -e "${GREEN}New project created successfully.${NC}"
else
    echo -e "${GREEN}Project linked successfully.${NC}"
fi

# Step 4: Set environment variables
echo -e "\n${YELLOW}[Step 4/10]${NC} Setting up environment variables..."
railway variables --set "NODE_ENV=production" --set "RAILWAY_ENVIRONMENT=true" --set "SCRAPER_HTTP_ONLY_MODE=true"

echo -e "\n${YELLOW}Do you want to set up your OpenAI API key? (y/n)${NC}"
read setup_openai

if [ "$setup_openai" = "y" ]; then
    echo -e "${YELLOW}Enter your OpenAI API key:${NC}"
    read -s openai_key
    railway variables --set "OPENAI_API_KEY=$openai_key"
    echo -e "${GREEN}OpenAI API key set.${NC}"
fi

# Step 5: Create PostgreSQL database service
echo -e "\n${YELLOW}[Step 5/10]${NC} Setting up PostgreSQL database..."
echo -e "${YELLOW}Creating a new PostgreSQL database service...${NC}"
echo -e "${YELLOW}Please select 'Database' and then 'PostgreSQL' from the menu options...${NC}"
railway add
# User should select Database and then PostgreSQL from the interactive menu
echo -e "${GREEN}PostgreSQL database service has been added to your project.${NC}"
echo -e "${YELLOW}Checking if DATABASE_URL environment variable was created...${NC}"
railway variables | grep -q "DATABASE_URL"
if [ $? -ne 0 ]; then
    echo -e "${RED}DATABASE_URL environment variable not found. Database might not have been created correctly.${NC}"
    echo -e "${YELLOW}You may need to manually add a PostgreSQL database in the Railway dashboard.${NC}"
else
    echo -e "${GREEN}DATABASE_URL environment variable found. Database created successfully!${NC}"
fi

# Step 6: Verify the railway.toml file is correct
echo -e "\n${YELLOW}[Step 6/10]${NC} Verifying railway.toml configuration..."
if [ ! -f "railway.toml" ]; then
    echo -e "${YELLOW}railway.toml not found. Creating it...${NC}"
    cat > railway.toml << EOF
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build-no-playwright && node fix-cheerio-import.js"

[deploy]
startCommand = "cross-env NODE_ENV=production SCRAPER_HTTP_ONLY_MODE=true node dist/production-http-only.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
EOF
    echo -e "${GREEN}railway.toml created with proper configuration.${NC}"
else
    echo -e "${GREEN}railway.toml exists. Using existing configuration.${NC}"
fi

# Step 7: Verify fix-cheerio-import.js exists
echo -e "\n${YELLOW}[Step 7/10]${NC} Verifying fix-cheerio-import.js script..."
if [ ! -f "fix-cheerio-import.js" ]; then
    echo -e "${RED}fix-cheerio-import.js not found. This is required for the build.${NC}"
    echo -e "${YELLOW}Please run this deployment script from the project root directory.${NC}"
    exit 1
else
    echo -e "${GREEN}fix-cheerio-import.js found. Continuing...${NC}"
fi

# Step 8: Deploy the application
echo -e "\n${YELLOW}[Step 8/10]${NC} Deploying application to Railway..."
railway up
if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed. Please check the logs above for details.${NC}"
    exit 1
fi
echo -e "${GREEN}Application deployed successfully!${NC}"

# Step 9: Wait for deployment to complete
echo -e "\n${YELLOW}[Step 9/10]${NC} Waiting for deployment to be ready..."
echo -e "${YELLOW}This may take a few minutes...${NC}"
sleep 20
echo -e "${GREEN}Continuing with post-deployment steps...${NC}"

# Step 10: Run database setup and migration
echo -e "\n${YELLOW}[Step 10/10]${NC} Setting up database..."
echo -e "${YELLOW}Running database initialization script...${NC}"
railway run node railway-setup.js
if [ $? -ne 0 ]; then
    echo -e "${RED}Database initialization failed. Please check the logs above for details.${NC}"
    echo -e "${YELLOW}You may need to run this command manually after deployment:${NC}"
    echo -e "${YELLOW}railway run node railway-setup.js${NC}"
else
    echo -e "${GREEN}Database initialized successfully!${NC}"
fi

echo -e "${YELLOW}Running database migrations...${NC}"
railway run npm run db:push
if [ $? -ne 0 ]; then
    echo -e "${RED}Database migration failed. Please check the logs above for details.${NC}"
    echo -e "${YELLOW}You may need to run this command manually after deployment:${NC}"
    echo -e "${YELLOW}railway run npm run db:push${NC}"
else
    echo -e "${GREEN}Database migration completed successfully!${NC}"
fi

# Final step: Show deployment URL
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}Your application is now available at:${NC}"
railway domain

echo -e ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. ${YELLOW}Check deployment status:${NC} railway status"
echo -e "2. ${YELLOW}View application logs:${NC} railway logs"
echo -e "3. ${YELLOW}Open your application:${NC} railway open"
echo -e "4. ${YELLOW}Restart your application if needed:${NC} railway service restart"
echo -e "${GREEN}================================================${NC}"