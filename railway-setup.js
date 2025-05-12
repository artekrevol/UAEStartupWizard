/**
 * Enhanced Railway Setup Script
 * 
 * This script is used to initialize the database on Railway with improved error handling and retry logic.
 * It should be run after deployment with: railway run node railway-setup.js
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { setTimeout } from 'timers/promises';

const exec = promisify(execCallback);

console.log('Starting Railway database migration...');

// Set production environment
process.env.NODE_ENV = 'production';

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

// Helper function to verify environment variables
async function verifyEnvironmentVariables() {
  console.log('Verifying environment variables...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  console.log('Environment variables verified successfully');
  
  // Test database connection
  try {
    console.log('Testing database connection...');
    
    // Use a basic Postgres query to check connection
    const { stdout } = await exec(`node -e "
      const { Pool } = require('@neondatabase/serverless');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      async function testConnection() {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('Database connection successful', result.rows[0]);
        client.release();
        await pool.end();
      }
      testConnection().catch(err => {
        console.error('Database connection error:', err.message);
        process.exit(1);
      });
    "`);
    
    console.log('Database connection test output:', stdout);
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    throw new Error('Failed to connect to the database');
  }
}

// Run the database migration with retry logic
async function runMigration(retries = MAX_RETRIES) {
  try {
    console.log(`Attempting database migration (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);
    const { stdout, stderr } = await exec('npm run db:push');
    
    if (stderr && !stderr.includes('Your database is now in sync')) {
      console.warn(`Migration stderr (may be normal): ${stderr}`);
    }
    
    console.log(`Migration stdout: ${stdout}`);
    console.log('Database migration completed successfully!');
    
    return true;
  } catch (error) {
    console.error(`Error during migration: ${error.message}`);
    
    if (retries > 1) {
      console.log(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
      await setTimeout(RETRY_DELAY_MS);
      return runMigration(retries - 1);
    } else {
      console.error('Maximum retry attempts reached. Migration failed.');
      return false;
    }
  }
}

// Verify database tables after migration
async function verifyTables() {
  try {
    console.log('Verifying database tables...');
    
    // List tables to verify they were created
    const { stdout } = await exec(`node -e "
      const { Pool } = require('@neondatabase/serverless');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      async function listTables() {
        const client = await pool.connect();
        const result = await client.query(\\"
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        \\");
        console.log('Tables in database:', result.rows.map(r => r.table_name).join(', '));
        client.release();
        await pool.end();
      }
      listTables().catch(err => {
        console.error('Table verification error:', err.message);
        process.exit(1);
      });
    "`);
    
    console.log('Table verification output:', stdout);
    return true;
  } catch (error) {
    console.error('Table verification failed:', error.message);
    return false;
  }
}

// Main function to run the entire setup
async function main() {
  try {
    // Step 1: Verify environment variables and database connection
    await verifyEnvironmentVariables();
    
    // Step 2: Run migration
    const migrationSuccess = await runMigration();
    if (!migrationSuccess) {
      throw new Error('Migration failed after all retry attempts');
    }
    
    // Step 3: Verify tables
    const tablesVerified = await verifyTables();
    if (!tablesVerified) {
      throw new Error('Table verification failed');
    }
    
    console.log('Railway setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute the main function
main();