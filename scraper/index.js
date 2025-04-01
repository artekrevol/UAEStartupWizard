// Main scraper script to populate database with all required data
import { scrapeFreeZones } from './free_zone_scraper.js';
import { populateBusinessActivities } from './business_activities_scraper.js';
import { populateAiTrainingData } from './ai_training_data_scraper.js';
import { populateDocumentTypes } from './document_types_scraper.js';

/**
 * Runs all data population scripts in sequence
 */
async function populateAllData() {
  console.log('======= Starting UAE Business Setup Database Population =======');
  console.log('This script will populate the database with necessary data for the application');
  
  try {
    // Step 1: Populate Free Zones
    console.log('\n===== Step 1: Populating Free Zones Data =====');
    await scrapeFreeZones();
    
    // Step 2: Populate Business Activities
    console.log('\n===== Step 2: Populating Business Activities Data =====');
    await populateBusinessActivities();
    
    // Step 3: Populate Document Types
    console.log('\n===== Step 3: Populating Document Types Data =====');
    await populateDocumentTypes();
    
    // Step 4: Populate AI Training Data
    console.log('\n===== Step 4: Populating AI Training Data =====');
    await populateAiTrainingData();
    
    console.log('\n======= Database Population Complete =======');
    console.log('All data has been successfully added to the database');
  } catch (error) {
    console.error('Error during database population:', error);
  }
}

// Run the script if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  populateAllData().catch(error => {
    console.error('Fatal error during database population:', error);
    process.exit(1);
  });
}

export { populateAllData };