# Updated Railway Deployment Guide

This guide provides updated instructions for deploying the UAE Business Setup Assistant to Railway with the latest fixes and improvements.

## Prerequisites

- A Railway account
- Railway CLI installed locally
- Git repository with your application code

## Deployment Steps

### 1. Install the Railway CLI

If you haven't already installed the Railway CLI, you can do so with:

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

Follow the prompts to log in to your Railway account.

### 3. Link to Your Railway Project

```bash
railway link
```

Select your workspace, project, and environment.

### 4. Configure Deployment Settings

Edit or create the `railway.toml` file in your project root with the following content:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build-no-playwright && node fix-cheerio-import.js"

[deploy]
startCommand = "cross-env NODE_ENV=production SCRAPER_HTTP_ONLY_MODE=true node dist/production-http-only.js"
restartPolicy = "always"
```

**Important Notes:**
- We've added the cheerio fix script to the build command
- We've removed the health check configuration to avoid deployment failures
- We're using the HTTP-only mode for the scraper to ensure compatibility

### 5. Create the Cheerio Fix Script

Create a file called `fix-cheerio-import.js` in your project root with the following content:

```javascript
/**
 * Fix Cheerio Import Script
 * 
 * This script patches the production-http-only.js file to use the correct cheerio import.
 * It corrects the "import cheerio from 'cheerio'" to "import * as cheerio from 'cheerio'"
 */

import fs from 'fs';

console.log('Starting cheerio import fix...');

const filePath = 'dist/production-http-only.js';

if (!fs.existsSync(filePath)) {
  console.error(`Error: ${filePath} not found. Make sure to run the build first.`);
  process.exit(1);
}

try {
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace default cheerio import with namespace import
  const fixedContent = content.replace(
    /import\s+cheerio\d*\s+from\s+['"]cheerio['"]/g, 
    'import * as cheerio from \'cheerio\''
  );
  
  if (content === fixedContent) {
    console.log('No cheerio import fixes needed.');
  } else {
    // Write the fixed content back
    fs.writeFileSync(filePath, fixedContent);
    console.log('Fixed cheerio import in production-http-only.js');
  }
} catch (error) {
  console.error('Error fixing cheerio import:', error);
  process.exit(1);
}

console.log('Cheerio import fix completed successfully.');
```

### 6. Deploy Your Application

```bash
railway up
```

This command will start the deployment process using the configuration in your `railway.toml` file.

### 7. Set Up Environment Variables

Set your environment variables using the Railway CLI:

```bash
railway variables set OPENAI_API_KEY=your_openai_api_key
railway variables set NODE_ENV=production
railway variables set SCRAPER_HTTP_ONLY_MODE=true
```

### 8. Add a PostgreSQL Database

If your application requires a PostgreSQL database, you can add one with:

```bash
railway service new postgresql
```

This will provision a new PostgreSQL database for your application.

### 9. Initialize the Database

After deployment, initialize your database with:

```bash
railway run node railway-setup.js
```

And apply schema migrations:

```bash
railway run npm run db:push
```

### 10. Verify Your Deployment

Once deployed, you can view your application with:

```bash
railway open
```

## Automatic Deployment Script

For a fully automated deployment, you can use the included `deploy-to-railway.sh` script:

```bash
./deploy-to-railway.sh
```

This script:
1. Installs the Railway CLI if needed
2. Logs in to Railway
3. Links to your project
4. Sets up environment variables
5. Adds a PostgreSQL database if needed
6. Deploys your application
7. Applies the cheerio fix
8. Shows the deployment URL

## Troubleshooting

If you encounter any issues during deployment, refer to the `RAILWAY_HEALTHCHECK_TROUBLESHOOTING.md` file for common issues and solutions.

For more detailed information about Railway deployment, visit the [Railway documentation](https://docs.railway.app/).