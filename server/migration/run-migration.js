// server/migration/run-migration.js
import { runAllMigrations } from './run-all.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function run() {
  try {
    // Step 1: Run our custom migrations
    console.log('Running custom migrations...');
    await runAllMigrations();
    
    // Step 2: Push any schema changes using Drizzle
    console.log('Pushing schema changes with Drizzle...');
    const { stdout, stderr } = await execAsync('npm run db:push');
    
    if (stdout) {
      console.log('Drizzle push output:', stdout);
    }
    
    if (stderr) {
      console.error('Drizzle push error:', stderr);
    }
    
    console.log('Migration and schema push completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the script
run();