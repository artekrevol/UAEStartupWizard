# Deployment Instructions for UAE Startup Wizard

This document provides step-by-step instructions for deploying the UAE Startup Wizard application to Railway with HTTP-only mode enabled.

## Prerequisites

1. Node.js and npm installed on your local machine
2. Railway CLI installed (`npm install -g @railway/cli`)
3. Railway account (sign up at https://railway.app if you don't have one)
4. PostgreSQL database URL (can be from Railway or external providers like Neon)

## Deployment Process

### Step 1: Clone the Repository

Clone the repository to your local machine and navigate to the project directory.

### Step 2: Build for HTTP-only Mode

The project includes a script to build the application with HTTP-only mode enabled:

```bash
./rebuild-http-only.sh
```

This script:
- Sets the necessary environment variables for HTTP-only mode
- Builds the frontend with Vite
- Builds the backend with esbuild
- Fixes any import issues with cheerio

### Step 3: Set Up Required Environment Variables

The application requires the following environment variables:

- `JWT_SECRET`: Secret key for JWT token generation
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY` (optional): For AI-powered features

You can set these in your terminal:

```bash
export JWT_SECRET=your_secret_key
export DATABASE_URL=postgres://username:password@host:port/database
export OPENAI_API_KEY=your_openai_api_key  # Optional
```

### Step 4: Deploy to Railway

You can use the provided deployment script:

```bash
./deploy-to-railway-local.sh
```

Or you can deploy manually with these steps:

1. Log in to Railway:
   ```bash
   railway login
   ```

2. Link your project (follow the interactive prompts):
   ```bash
   railway link
   ```

3. Set environment variables:
   ```bash
   railway variables set JWT_SECRET="your_secret" DATABASE_URL="your_db_url" NODE_ENV=production SCRAPER_HTTP_ONLY_MODE=true PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 USE_HTTP_ONLY_SCRAPER=true
   ```

4. Deploy the application:
   ```bash
   railway up
   ```

### Step 5: Verify Deployment

1. Open your application in Railway:
   ```bash
   railway open
   ```

2. Check the deployment logs:
   ```bash
   railway logs
   ```

## Troubleshooting

### Playwright Errors

If you see Playwright-related errors, ensure these environment variables are set:
- `SCRAPER_HTTP_ONLY_MODE=true`
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`
- `USE_HTTP_ONLY_SCRAPER=true`

### Database Connectivity Issues

If you encounter database connectivity issues:
1. Verify your DATABASE_URL is correct
2. Ensure your IP is allowed in the database's network policies
3. Check if you need to create the tables (run `node railway-setup.js` after deployment)

### Deployment Timeouts

If your deployment times out, try:
1. Deploying from your local machine with `railway up`
2. Breaking up the deployment process (set variables first, then deploy)
3. Using a different web browser if the Railway dashboard is unresponsive

## Post-Deployment Steps

After successful deployment:

1. Run database migrations:
   ```bash
   railway run node railway-setup.js
   ```

2. Create an admin user:
   ```bash
   railway run node create-test-admin.js
   ```

3. Monitor the application logs:
   ```bash
   railway logs
   ```

## Switching Back to Browser-Based Mode

If you want to switch back to the browser-based version with Playwright:

1. Set `SCRAPER_HTTP_ONLY_MODE=false` in Railway variables
2. Add `npx playwright install --with-deps chromium` to your project's build command
3. Redeploy the application