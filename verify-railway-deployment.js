/**
 * Railway Deployment Verification Script
 * 
 * This script helps verify and troubleshoot Railway deployments by:
 * 1. Checking if all required environment variables are set
 * 2. Testing database connectivity
 * 3. Verifying file access to critical components
 * 
 * Usage: railway run node verify-railway-deployment.js
 */

import { createPool } from '@neondatabase/serverless';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper function to log with colors
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  section: (msg) => console.log(`\n\x1b[35m=== ${msg} ===\x1b[0m`)
};

async function verifyDeployment() {
  log.section('Railway Deployment Verification');
  log.info('Starting deployment verification...');
  
  // Check 1: Environment Variables
  log.section('Environment Variables');
  const requiredVars = [
    'DATABASE_URL', 
    'NODE_ENV',
    'SCRAPER_HTTP_ONLY_MODE'
  ];
  
  const optionalVars = [
    'OPENAI_API_KEY'
  ];
  
  let missingRequired = false;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      log.success(`${varName}: ✓ Set`);
      
      // Mask sensitive values
      if (varName === 'DATABASE_URL') {
        const maskedUrl = process.env[varName].replace(/:[^:@]*@/, ':****@');
        log.info(`Value (masked): ${maskedUrl}`);
      }
    } else {
      log.error(`${varName}: ✗ Missing`);
      missingRequired = true;
    }
  }
  
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      log.success(`${varName}: ✓ Set`);
    } else {
      log.warning(`${varName}: ⚠ Not set (optional)`);
    }
  }
  
  if (missingRequired) {
    log.error('Required environment variables are missing. Deployment may fail.');
  } else {
    log.success('All required environment variables are set.');
  }
  
  // Check 2: Database Connectivity
  log.section('Database Connectivity');
  
  if (!process.env.DATABASE_URL) {
    log.error('Cannot test database connectivity without DATABASE_URL.');
  } else {
    try {
      log.info('Attempting to connect to database...');
      const pool = createPool({ connectionString: process.env.DATABASE_URL });
      const client = await pool.connect();
      
      // Try to run a simple query
      const result = await client.query('SELECT NOW()');
      log.success('Database connection successful!');
      log.info(`Server time: ${result.rows[0].now}`);
      
      // Check if tables exist
      log.info('Checking for database tables...');
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      if (tablesResult.rows.length === 0) {
        log.warning('No tables found in the database. You may need to run migrations.');
      } else {
        log.success(`Found ${tablesResult.rows.length} tables in the database.`);
        log.info('Tables: ' + tablesResult.rows.map(r => r.table_name).join(', '));
      }
      
      // Release the client
      client.release();
    } catch (error) {
      log.error(`Database connection failed: ${error.message}`);
      log.info('Troubleshooting tips:');
      log.info('1. Verify DATABASE_URL is correct');
      log.info('2. Ensure the database service is running');
      log.info('3. Check if IP restrictions are in place');
      log.info('4. Verify SSL settings if required');
    }
  }
  
  // Check 3: File System
  log.section('File System Check');
  
  const criticalPaths = [
    'dist/production-http-only.js',
    'package.json',
    'railway.toml'
  ];
  
  for (const path of criticalPaths) {
    try {
      if (fs.existsSync(path)) {
        const stats = fs.statSync(path);
        log.success(`${path}: ✓ Found (${stats.size} bytes)`);
      } else {
        log.error(`${path}: ✗ Not found`);
      }
    } catch (error) {
      log.error(`${path}: ✗ Error checking file: ${error.message}`);
    }
  }
  
  // Check 4: Railway Service Status
  log.section('Railway Service Status');
  
  try {
    log.info('Checking Railway service status...');
    const { stdout } = await execAsync('railway status');
    log.info('Service status information:');
    console.log(stdout);
  } catch (error) {
    log.error(`Failed to check Railway status: ${error.message}`);
  }
  
  // Check 5: Check cheerio import issues
  log.section('Cheerio Import Check');
  
  try {
    log.info('Checking for cheerio import issues...');
    
    if (fs.existsSync('dist/production-http-only.js')) {
      const content = fs.readFileSync('dist/production-http-only.js', 'utf8');
      const cheerioImports = content.match(/import\s+[*\s\w]+\s+from\s+['"]cheerio['"]/g) || [];
      
      if (cheerioImports.length > 1) {
        log.error(`Found ${cheerioImports.length} cheerio imports. Multiple imports can cause runtime errors.`);
        log.info('Run the fix-cheerio-import.js script to resolve this issue.');
      } else if (cheerioImports.length === 1) {
        if (cheerioImports[0].includes('import * as cheerio')) {
          log.success('Cheerio import has the correct format.');
        } else {
          log.error('Cheerio import has incorrect format. Should use "import * as cheerio from \'cheerio\';"');
          log.info('Run the fix-cheerio-import.js script to resolve this issue.');
        }
      } else {
        log.warning('No cheerio imports found. This might be okay if your app doesn\'t use cheerio.');
      }
    } else {
      log.error('Cannot check cheerio imports: dist/production-http-only.js not found');
    }
  } catch (error) {
    log.error(`Failed to check cheerio imports: ${error.message}`);
  }

  // Summary
  log.section('Verification Summary');
  log.info('Deployment verification completed.');
  log.info('For more detailed logs, use the command: railway logs');
}

// Run the verification
verifyDeployment().catch(error => {
  log.error(`An unexpected error occurred during verification: ${error.message}`);
  log.error(error.stack);
  process.exit(1);
});