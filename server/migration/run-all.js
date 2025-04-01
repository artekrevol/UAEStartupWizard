// server/migration/run-all.js
import { runMigration } from './add-business-activities-fields.js';
import { importBusinessActivities } from './import-business-activities.js';
import path from 'path';

async function runAllMigrations() {
  try {
    // Step 1: Run the database schema migration
    console.log("Step 1: Running database schema migration...");
    await runMigration();
    
    // Step 2: Import business activities from CSV
    console.log("Step 2: Importing business activities from CSV...");
    const csvFilePath = './attached_assets/ISIC_Activity-Lists_2024.csv';
    const importedCount = await importBusinessActivities(csvFilePath);
    
    console.log(`Migration complete. Imported ${importedCount} business activities.`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migrations immediately when the script is executed
runAllMigrations();

export { runAllMigrations };