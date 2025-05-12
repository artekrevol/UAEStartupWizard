# Railway Deployment Steps

This document outlines the steps to successfully deploy the application to Railway after our fixes.

## Key Changes Made

1. **Fixed Variable Name Mismatch**:
   - Corrected the use of `businessCategories` to `businessActivityCategories` in server/routes.ts
   - This fixes a critical error where the application was trying to access a non-existent table
   
2. **Enhanced Build Process**:
   - Using the `build-no-playwright` command to create a deployment that uses HTTP-only scraping
   - Running `fix-cheerio-import.js` after the build to handle import compatibility issues

3. **Created Improved Deployment Script**:
   - `deploy-to-railway-enhanced.sh` provides a robust deployment process
   - Includes checks for required environment variables
   - Verifies deployment health after completion

## Deployment Steps

Follow these steps to deploy your application to Railway:

### Step 1: Set Required Environment Variables

```bash
# Required variables
export JWT_SECRET=your_jwt_secret_here
export DATABASE_URL=your_postgres_database_url
export OPENAI_API_KEY=your_openai_api_key  # Optional but recommended
```

### Step 2: Ensure Railway CLI is Installed and Logged In

```bash
# Install Railway CLI if needed
npm i -g @railway/cli

# Log in to Railway
railway login
```

### Step 3: Run the Enhanced Deployment Script

```bash
./deploy-to-railway-enhanced.sh
```

The script will:
1. Check that all requirements are met
2. Build the application
3. Deploy to Railway
4. Set all required environment variables
5. Verify the deployment is working

### Step 4: Verify Database Setup

After deployment, ensure your database schema is properly set up:

```bash
# Run this once after initial deployment
railway run node railway-setup.js
```

This will initialize the database tables required by the application.

## Troubleshooting

If you encounter issues:

1. **502 Bad Gateway**:
   - Check Railway logs for errors
   - Ensure DATABASE_URL is correct
   - Verify JWT_SECRET is set

2. **Database Connection Issues**:
   - Make sure your database is correctly provisioned
   - Check if IP restrictions are preventing connections
   - Consider using an external database like Neon Postgres

3. **Build Failures**:
   - Review the build logs for specific errors
   - Make sure fix-cheerio-import.js is running after the build

## Additional Notes

* The deployment uses HTTP-only scraping mode for maximum compatibility
* This version avoids Playwright dependencies which can cause issues in some environments
* For full Playwright functionality, consider using a different deployment approach