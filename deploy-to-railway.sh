#!/bin/bash
# Railway Deployment Script

echo "================================================"
echo "Railway Deployment - UAE Business Setup Assistant"
echo "================================================"

# Step 1: Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Railway CLI not found. Installing..."
    npm i -g @railway/cli
else
    echo "Railway CLI found. Continuing..."
fi

# Step 2: Login to Railway (if not already logged in)
echo "Logging in to Railway..."
railway login

# Step 3: Link to existing project or create new one
echo "Checking Railway projects..."
if ! railway project list &> /dev/null; then
    echo "No projects found or need to select a project. Creating a new project..."
    railway project create
else
    echo "Projects found. Please select a project to deploy to:"
    railway link
fi

# Step 4: Set environment variables
echo "Setting up environment variables..."
railway variables set NODE_ENV=production
railway variables set RAILWAY_ENVIRONMENT=true
railway variables set SCRAPER_HTTP_ONLY_MODE=true

echo "Do you want to set up your OpenAI API key? (y/n)"
read setup_openai

if [ "$setup_openai" = "y" ]; then
    echo "Enter your OpenAI API key:"
    read openai_key
    railway variables set OPENAI_API_KEY="$openai_key"
fi

# Step 5: Add a PostgreSQL database
echo "Setting up PostgreSQL database..."
echo "Creating a new PostgreSQL database service..."
railway service create postgresql
echo "PostgreSQL database service created."

# Step 6: Deploy the application
echo "Deploying application to Railway..."
railway up

# Step 7: Wait a moment for deployment to complete
echo "Waiting for deployment to complete..."
sleep 10

# Step 8: Apply cheerio fix post-deployment
echo "Applying cheerio import fix..."
railway run node fix-cheerio-import.js

# Step 9: Run database setup
echo "Running database setup..."
railway run node railway-setup.js

# Step 10: Show deployment URL
echo "================================================"
echo "Deployment complete! Your application is now available at:"
railway domain

echo ""
echo "Next steps:"
echo "1. Check your deployment using 'railway status'"
echo "2. Migrate your database schema using 'railway run npm run db:push'"
echo "3. Monitor your deployment logs with 'railway logs'"
echo "4. Open your application with 'railway open'"
echo "================================================"