import path from 'path';
import { db } from './db';
import { importIsicActivities } from './csv-parser';
import { businessActivities } from '@shared/schema';
import { Pool } from 'pg';

/**
 * Import ISIC activities from CSV to database
 */
async function importActivitiesToDatabase() {
  try {
    // Path to the CSV file
    const csvFilePath = path.join(process.cwd(), 'attached_assets', 'ISIC_Activity-Lists_2024.csv');
    
    console.log(`Starting ISIC activities import from ${csvFilePath}`);
    
    // Parse the CSV file
    const activities = await importIsicActivities(csvFilePath);
    console.log(`Successfully parsed ${activities.length} activities`);
    
    // Batch size for insertion
    const BATCH_SIZE = 50;
    let insertedCount = 0;
    
    // Process activities in batches to avoid memory issues
    for (let i = 0; i < activities.length; i += BATCH_SIZE) {
      const batch = activities.slice(i, i + BATCH_SIZE);
      
      try {
        // Convert to the format expected by the database
        const dbActivities = batch.map(activity => {
          // Ensure all required fields are present
          if (!activity.name) {
            return null; // Skip activities without names
          }
          
          return {
            name: activity.name,
            activityCode: activity.activityCode || '',
            description: activity.description,
            nameArabic: activity.nameArabic,
            descriptionArabic: activity.descriptionArabic,
            industryGroup: activity.industryGroup,
            isicActivity: activity.isicActivity || false
          };
        }).filter(Boolean); // Remove null items
        
        if (dbActivities.length > 0) {
          // Insert activities into the database
          await db.insert(businessActivities).values(dbActivities as any);
          insertedCount += dbActivities.length;
          console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(activities.length / BATCH_SIZE)}`);
        }
      } catch (error) {
        console.error(`Error inserting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
      }
    }
    
    console.log(`Import complete. Inserted ${insertedCount} of ${activities.length} activities.`);
  } catch (error) {
    console.error('Error in import process:', error);
  } finally {
    // Close the database connection
    try {
      const pool = db.$client as Pool;
      if (pool && typeof pool.end === 'function') {
        await pool.end();
      }
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
  }
}

// Run the import process
importActivitiesToDatabase()
  .then(() => {
    console.log('ISIC activities import process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during ISIC activities import:', error);
    process.exit(1);
  });