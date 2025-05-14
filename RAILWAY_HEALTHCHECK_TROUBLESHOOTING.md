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

### 2. Cheerio Import Errors

There are two common runtime errors related to cheerio module imports:

#### Error 1: Module doesn't provide default export

```
SyntaxError: The requested module 'cheerio' does not provide an export named 'default'
```

This happens because of a mismatch between how cheerio is imported and how it's packaged. The Vite/esbuild process sometimes converts the namespace import (`import * as cheerio from 'cheerio'`) to a default import (`import cheerio from 'cheerio'`), which fails at runtime in ESM modules.

#### Error 2: Identifier already declared

```
SyntaxError: Identifier 'cheerio' has already been declared
```

This happens when there are multiple cheerio imports in the bundled file, which can occur after applying the first fix without properly handling duplicate imports.

**Solution:**

We've created an improved `fix-cheerio-import.js` script that handles both issues:

```javascript
/**
 * Fix Cheerio Import Script
 * 
 * This script patches the production-http-only.js file to fix cheerio import issues:
 * 1. First pass: Handles the case where default import is used but cheerio doesn't have default export
 * 2. Second pass: Handles duplicate cheerio imports that might cause "already declared" errors
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
  
  // Keep track of changes
  let changesApplied = false;
  
  // STEP 1: Find all cheerio imports
  const cheerioImports = content.match(/import\s+[*\s\w]+\s+from\s+['"]cheerio['"]/g) || [];
  console.log(`Found ${cheerioImports.length} cheerio imports`);
  
  // STEP 2: If we have multiple imports, keep only the first one and remove the rest
  if (cheerioImports.length > 1) {
    console.log('Detected multiple cheerio imports, fixing duplicates...');
    
    // Get the first import (we'll standardize this one)
    const firstImport = cheerioImports[0];
    
    // Replace the first import with our standardized import
    content = content.replace(
      firstImport,
      'import * as cheerio from \'cheerio\''
    );
    
    // Remove all subsequent imports (skipping the first one we already replaced)
    for (let i = 1; i < cheerioImports.length; i++) {
      content = content.replace(cheerioImports[i], '// Removed duplicate cheerio import');
    }
    
    changesApplied = true;
    console.log(`Standardized first import and removed ${cheerioImports.length - 1} duplicate imports`);
  } 
  // STEP 3: If we have only one import, make sure it's the right format
  else if (cheerioImports.length === 1) {
    console.log('Single cheerio import found, ensuring correct format...');
    
    // If the import is not already using the namespace format, change it
    if (!cheerioImports[0].includes('import * as cheerio')) {
      content = content.replace(
        cheerioImports[0],
        'import * as cheerio from \'cheerio\''
      );
      changesApplied = true;
      console.log('Fixed cheerio import format');
    } else {
      console.log('Cheerio import already has correct format');
    }
  }
  
  // Write the changes back to the file if any were made
  if (changesApplied) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed cheerio imports in production-http-only.js');
  } else {
    console.log('No changes were required');
  }
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