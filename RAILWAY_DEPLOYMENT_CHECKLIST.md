# Railway Deployment Checklist

Use this checklist to ensure your UAE Business Setup Assistant deployment to Railway is successful with all features enabled, including Playwright-based web scraping.

## Deployment Preparation

- [x] Create railway.toml configuration file
- [x] Configure Procfile for Railway
- [x] Update scraper config.js to detect Railway environment
- [x] Prepare server/production.js for Railway
- [x] Create comprehensive deployment guide

## Pre-Deployment Tasks

- [ ] Push your code to GitHub
- [ ] Create a Railway account
- [ ] Gather all required API keys and secrets

## Railway Setup

- [ ] Create a new project in Railway
- [ ] Connect your GitHub repository
- [ ] Add PostgreSQL database to your project 

## Environment Configuration

- [ ] Set required environment variables:
  - [ ] NODE_ENV=production
  - [ ] RAILWAY_ENVIRONMENT=true
  - [ ] OPENAI_API_KEY=your_key_here
  - [ ] Additional API keys as needed

## Database Migration

- [ ] After deployment, run database migrations:
  - [ ] Run initial schema setup

## Post-Deployment Verification

- [ ] Check application health at /health endpoint
- [ ] Verify frontend is accessible
- [ ] Test API endpoints
- [ ] Verify Playwright-based scraping is working
- [ ] Check logs for any errors

## Common Issues

### Playwright installation fails
- Check railway.toml has `buildCommand` that includes `npx playwright install chromium --with-deps`
- Ensure the [nixpacks] section includes chromium feature

### Database connection fails
- Verify DATABASE_URL is set correctly
- Check if the database was created properly

### Application doesn't start
- Check build logs for errors
- Verify Procfile has correct start command

### Scraper doesn't use Playwright
- Make sure RAILWAY_ENVIRONMENT=true is set
- Check logs to confirm scraper mode detection