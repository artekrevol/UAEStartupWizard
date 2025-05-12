/**
 * Railway Setup Script
 * 
 * This script is used to initialize the database on Railway
 * It should be run after deployment with: railway run node railway-setup.js
 */

console.log('Starting Railway database migration...');

// Run the database migration
const { exec } = require('child_process');

// Set production environment
process.env.NODE_ENV = 'production';

exec('npm run db:push', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error during migration: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Migration stderr: ${stderr}`);
  }
  
  console.log(`Migration stdout: ${stdout}`);
  console.log('Database migration completed successfully!');
});