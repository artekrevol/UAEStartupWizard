# Railway Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. Health Check Failures

If your deployment is failing during health checks, you may need to remove or adjust the health check configuration. This can be done by removing the `healthcheckPath` and `healthcheckTimeout` settings from the `railway.toml` file.

**Solution:**
```toml
[deploy]
startCommand = "cross-env NODE_ENV=production SCRAPER_HTTP_ONLY_MODE=true node dist/production-http-only.js"
restartPolicy = "always"
# Health check configuration removed
```

### 2. Cheerio Import Error

One common runtime error is related to cheerio module imports. The error looks like this:

```
SyntaxError: The requested module 'cheerio' does not provide an export named 'default'
```

This happens because of a mismatch between how cheerio is imported and how it's packaged. The Vite/esbuild process sometimes converts the namespace import (`import * as cheerio from 'cheerio'`) to a default import (`import cheerio from 'cheerio'`), which fails at runtime in ESM modules.

**Solution:**

We've created a `fix-cheerio-import.js` script that patches the built production file to use the correct import syntax:

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
  
  // Write the fixed content back
  fs.writeFileSync(filePath, fixedContent);
  console.log('Fixed cheerio import in production-http-only.js');
} catch (error) {
  console.error('Error fixing cheerio import:', error);
  process.exit(1);
}

console.log('Cheerio import fix completed successfully.');
```

The fix is automatically applied during the build process:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build-no-playwright && node fix-cheerio-import.js"
```

### 3. Railway CLI Command Changes

The Railway CLI command syntax has changed significantly from what was initially documented. If you encounter errors like `unrecognized subcommand` or `unexpected argument`, you may need to update your deployment scripts.

**Updated command examples:**
- `railway link` instead of `railway project link`
- `railway up` instead of `railway deploy`
- `railway run <command>` instead of `railway run -- <command>`

For the latest Railway CLI command syntax, refer to the official Railway documentation or run `railway --help`.

### 4. Database Migration Issues

If you encounter database migration issues, make sure to run the setup script after deployment:

```bash
railway run node railway-setup.js
```

For schema migrations:

```bash
railway run npm run db:push
```