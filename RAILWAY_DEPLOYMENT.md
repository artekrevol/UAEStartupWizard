# Deploying to Railway

This guide explains how to deploy the UAE Business Setup Assistant to Railway with all functionality intact, including Playwright-based scraping.

## Why Railway?

Railway is an excellent choice for this application because:

1. **Full Support for Complex Dependencies**: Railway handles Playwright and browser automation without issues
2. **PostgreSQL Integration**: Built-in PostgreSQL database integration with automatic connection
3. **Continuous Deployment**: Automatic deployments when you push changes to your repository
4. **Zero Compromise**: All features including web scraping work properly without modification
5. **Cost-Effective**: More affordable than traditional VPS solutions for running browser automation

## Prerequisites

Before deploying to Railway, you'll need:

1. A Railway account (sign up at [railway.app](https://railway.app))
2. Your source code in a GitHub repository (for easy deployment)
3. Your environment variables ready (especially DATABASE_URL and OPENAI_API_KEY)

## Files Ready for Railway Deployment

We've already prepared the necessary files for deploying to Railway:

1. **railway.toml**: Configuration file for Railway with Playwright support
   - Includes Chromium installation
   - Configures health checks
   - Sets environment variables
   
2. **server/production.js**: Production-ready server entry point
   - Optimized for Railway deployment
   - Includes security headers
   - Properly serves frontend and API routes
   
3. **Procfile**: Instructions for Railway on how to build and start the application

## Step-by-Step Deployment Guide

### 1. Fork or Push Your Repository to GitHub

1. Create a GitHub repository for your project
2. Push your code to the repository
3. Make sure the three files mentioned above are included

### 2. Sign Up for Railway

If you don't have a Railway account:
1. Go to [railway.app](https://railway.app)
2. Sign up using your GitHub account (recommended for easier repository access)

### 3. Create a New Project

1. Click "New Project" in the Railway dashboard
2. Select "Deploy from GitHub repo"
3. Select your repository
4. Railway will automatically detect the Node.js project and use your configuration

### 4. Configure Environment Variables

In the Railway dashboard:
1. Go to the "Variables" tab
2. Add the following environment variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` (this will be provided automatically if you create a PostgreSQL instance)
   - `OPENAI_API_KEY` = Your OpenAI API key
   - Any other secrets or keys your application needs

### 5. Add a PostgreSQL Database

1. Click "New" and select "Database"
2. Choose "PostgreSQL"
3. Railway will automatically create a database and set up the `DATABASE_URL` environment variable

### 6. Deploy Your Application

Railway will automatically deploy your application after setting up the environment variables and database.

The deployment process:
1. Builds your frontend with Vite
2. Builds your backend using your production entry point
3. Installs Playwright and Chromium dependencies
4. Starts the server

### 7. Setting Up Custom Domain (Optional)

1. In your project settings, click "Settings"
2. Scroll to "Domains"
3. Click "Generate Domain" or "Custom Domain" if you have your own domain

## Database Migration

The first time your application runs on Railway, it will need to set up the database schema:

1. Railway automatically provides the connection string as an environment variable
2. Your application uses Drizzle ORM for database operations
3. Create a migration script or use the `db:push` command from Drizzle to create your schema

## Making Updates to Your Deployment

One of the best features of Railway is how easy it is to update your application:

1. Make changes to your code locally
2. Commit and push to your GitHub repository
3. Railway automatically detects changes and redeploys your application

This means you don't need any special process for updates - just normal git workflow!

## Monitoring and Logs

Railway provides excellent monitoring tools:

1. Go to your project in the Railway dashboard
2. Click "Deployments" to see deployment history
3. Click on a deployment to view logs
4. Monitor resource usage including CPU, memory, and network

## Common Issues and Troubleshooting

If you encounter issues:

1. **Database Connectivity**: Make sure your schema migrations are running correctly during deployment
2. **Environment Variables**: Double-check that all required variables are set
3. **Build Failures**: Check the deployment logs for detailed error messages
4. **Playwright Issues**: Ensure your railway.toml has the correct Playwright installation commands

## Cost Considerations

Railway offers:
- A free starter plan with a usage-based quota
- Pro plans starting at $5/month + usage

For this application with Playwright, expect costs around $10-20/month depending on usage, which is much more cost-effective than maintaining infrastructure with browser dependencies elsewhere.

## Comparison with Alternative Approaches

| Approach | Pros | Cons |
|----------|------|------|
| **Railway (full features)** | Full functionality including Playwright, easy deployment, managed PostgreSQL | Slightly higher cost than minimal deployments |
| **HTTP-only deployment** | Lower resource requirements, works on more platforms | Limited scraping capabilities, requires separate data source |
| **Traditional VPS** | Complete control over environment | Higher maintenance overhead, manual setup of dependencies |

Railway gives you the best balance of features, ease of use, and cost-effectiveness.