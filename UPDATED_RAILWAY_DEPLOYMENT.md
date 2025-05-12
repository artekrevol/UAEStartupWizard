# Updated Railway Deployment Guide

This guide provides updated instructions for deploying the application to Railway.

## Prerequisites

1. Railway account (sign up at https://railway.app if you don't have one)
2. Git repository for your project

## Setup

1. Login to Railway:
   ```bash
   railway login
   ```

2. Link your project:
   ```bash
   railway link
   ```

3. Add a PostgreSQL database:
   ```bash
   railway add
   ```
   Select PostgreSQL from the list of plugins.

## Deployment

1. Push the latest changes to your Git repository:
   ```bash
   git add .
   git commit -m "Updated Railway deployment configuration"
   git push
   ```

2. Deploy to Railway:
   ```bash
   railway up
   ```

3. Check deployment status:
   ```bash
   railway status
   ```

4. View logs:
   ```bash
   railway logs
   ```

## Database Migration

After a successful deployment, run the database migration:

```bash
railway run node railway-setup.js
```

## Configuration Files

The following files handle the Railway deployment:

1. `Procfile`:
   ```
   web: cross-env NODE_ENV=production SCRAPER_HTTP_ONLY_MODE=true node dist/production-http-only.js
   ```

2. `railway.toml`:
   ```toml
   [build]
   builder = "nixpacks"
   buildCommand = "npm install && npm run build-no-playwright"
   
   [deploy]
   startCommand = "cross-env NODE_ENV=production SCRAPER_HTTP_ONLY_MODE=true node dist/production-http-only.js"
   healthcheckPath = "/healthz"
   healthcheckTimeout = 300
   restartPolicyType = "on-failure"
   restartPolicyMaxRetries = 10
   ```

## Health Check Endpoint

The application includes a health check endpoint at `/healthz` which is used by Railway to verify that the application is running correctly.

## Environment Variables

Make sure to set these environment variables in the Railway dashboard:

- `NODE_ENV`: production
- `RAILWAY_ENVIRONMENT`: true
- `SCRAPER_HTTP_ONLY_MODE`: true
- `OPENAI_API_KEY`: Your OpenAI API key

## Troubleshooting

If you encounter health check failures:

1. Check the logs for any errors:
   ```bash
   railway logs
   ```

2. Make sure the health check endpoint is implemented in `production-http-only.js`

3. Try increasing the health check timeout in `railway.toml`

4. Verify that the database is properly connected by running the migration script:
   ```bash
   railway run node railway-setup.js
   ```

5. If all else fails, try a fresh deployment:
   ```bash
   railway up --detach
   ```