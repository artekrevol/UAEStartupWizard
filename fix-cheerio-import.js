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