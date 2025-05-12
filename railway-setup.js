/**
 * Railway Setup Script
 * 
 * This script is used to initialize the database on Railway
 * It should be run after deployment with: railway run node railway-setup.js
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

console.log('Starting Railway database migration...');

// Set production environment
process.env.NODE_ENV = 'production';

// Run the database migration using async/await with ES modules
async function runMigration() {
  try {
    const { stdout, stderr } = await exec('npm run db:push');
    
    if (stderr) {
      console.error(`Migration stderr: ${stderr}`);
    }
    
    console.log(`Migration stdout: ${stdout}`);
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error(`Error during migration: ${error.message}`);
  }
}

// Execute the migration
runMigration();