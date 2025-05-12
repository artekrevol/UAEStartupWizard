# Troubleshooting Railway Health Check Issues

If you're facing health check failures on Railway, here are step-by-step solutions to get your deployment working properly.

## Common Health Check Failures

Railway performs health checks by making HTTP requests to your application's health check endpoint (specified in railway.toml). If your application doesn't respond with a 200 OK status, the health check fails.

### Issue: "Service unavailable" errors in health checks

This is what you're seeing in your logs:
```
Starting Healthcheck
====================
Path: /health
Retry window: 5m0s
 
Attempt #1 failed with service unavailable. Continuing to retry for 4m49s
Attempt #2 failed with service unavailable. Continuing to retry for 4m47s
...
1/1 replicas never became healthy!
Healthcheck failed!
```

## Step-by-Step Solutions

### Solution 1: Check your application logs

First, we need to understand what's happening with your app:

1. Go to Railway dashboard
2. Click on your deployment
3. Click on "Logs" tab
4. Look for error messages that might indicate why your application isn't starting

Common issues to look for:
- Connection errors to database
- Missing environment variables
- Port binding issues
- Crashes during startup

### Solution 2: Check environment variables

Make sure these environment variables are set in Railway:

```
NODE_ENV=production
RAILWAY_ENVIRONMENT=true
DATABASE_URL=<should be automatically set by Railway>
```

### Solution 3: Use the fixes we've already implemented

We've already made these changes to fix the health check issues:

1. **Added multiple health check endpoints**:
   - `/health` and `/healthz` are both available now
   - Railway is configured to use `/healthz` in railway.toml

2. **Improved error handling in server startup**:
   - Better error detection and reporting
   - Clear logging of environment and port

3. **Increased health check timeout**:
   - Changed from 300s to 600s in railway.toml
   - Increased max retries from 3 to 5

### Solution 4: Modify build command

If your app still fails to start, try updating the Railway CLI directly:

```bash
railway vars set buildCommand="npm run build && npx playwright install chromium --with-deps"
railway vars set startCommand="node dist/production.js"
```

### Solution 5: Restart with clean environment

Sometimes you need a fresh start:

1. Delete your current deployment in Railway
2. Create a new project
3. Connect your GitHub repository again
4. Set all environment variables
5. Deploy again

### Solution 6: Disable health checks temporarily

If you need to debug further, you can temporarily disable health checks:

1. Update your `railway.toml` file:
```toml
[deploy]
startCommand = "npm start"
# Comment out health check settings
# healthcheckPath = "/healthz"
# healthcheckTimeout = 600
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

2. Push these changes to GitHub
3. Once deployed, check the logs to see if your application is running
4. After you fix the issues, re-enable the health checks

## Contact Railway Support

If all these steps fail, Railway has excellent support:

1. Join the Railway Discord: https://discord.com/invite/railway
2. Post in the #help channel with:
   - Your project name
   - The health check error message
   - Steps you've tried
   - Any relevant logs

## Important Files To Check

If you continue to have issues, review these key files:

1. `railway.toml` - Configures how Railway builds and runs your app
2. `server/production.js` - The main entry point for your production application
3. `Procfile` - Defines the commands Railway runs to start your application