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
if railway list 2>&1 | grep -q "No projects found"; then
    echo "No projects found. Creating a new project..."
    railway init
else
    echo "Projects found. Please select a project to deploy to:"
    railway link
fi

# Step 4: Set environment variables
echo "Setting up environment variables..."
railway vars set NODE_ENV=production
railway vars set RAILWAY_ENVIRONMENT=true

echo "Do you want to set up your OpenAI API key? (y/n)"
read setup_openai

if [ "$setup_openai" = "y" ]; then
    echo "Enter your OpenAI API key:"
    read openai_key
    railway vars set OPENAI_API_KEY="$openai_key"
fi

# Step 5: Add a PostgreSQL database if not already added
echo "Checking for PostgreSQL database..."
if ! railway service ls 2>&1 | grep -q "postgresql"; then
    echo "PostgreSQL not found. Adding PostgreSQL database..."
    railway add --plugin postgresql
    echo "PostgreSQL database added."
else
    echo "PostgreSQL database already exists."
fi

# Step 6: Deploy the application
echo "Deploying application to Railway..."
railway up

# Step 7: Apply cheerio fix post-deployment
echo "Applying cheerio import fix..."
railway run node fix-cheerio-import.js

# Step 8: Show deployment URL
echo "================================================"
echo "Deployment complete! Your application is now available at:"
railway domain

echo ""
echo "Next steps:"
echo "1. Check your deployment using the verify-railway-deployment.js script"
echo "2. Migrate your database schema using 'railway run npm run db:push'"
echo "3. Monitor your deployment in the Railway dashboard"
echo "================================================"