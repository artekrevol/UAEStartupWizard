# Manual Railway Deployment Guide

## 1. Go to Railway.app
- Visit https://railway.app
- Log in to your account

## 2. Set Up Your Project
- Select your "UAEStartupWizard" project
- Find your "web" service

## 3. Environment Variables
In the "Variables" section, add these environment variables:
- NODE_ENV: production
- RAILWAY_ENVIRONMENT: true
- PORT: 8080
- OPENAI_API_KEY: (your API key)

## 4. Health Check Configuration
In the "Settings" section:
- Set health check path to "/healthz"
- Set health check timeout to 300s

## 5. Add PostgreSQL (if needed)
- Click "New" and select "Database"
- Choose "PostgreSQL"
- The connection string will be automatically added to your environment variables

## 6. Deploy
- Trigger a deployment manually from the web interface
- Monitor the deployment logs for any issues

## 7. Testing
- Once deployed, test the application by visiting your app URL
- Test the health check endpoint: your-app-url/healthz
