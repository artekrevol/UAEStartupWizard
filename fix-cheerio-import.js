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
  // STEP 4: If we don't find any imports, no action needed
  else {
    console.log('No cheerio imports found, no fixes needed');
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