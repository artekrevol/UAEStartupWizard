/**
 * Runs all data population scripts in sequence
 */
import { scraperManager } from './scraper_manager.js';
import cron from 'node-cron';

async function populateAllData() {
  console.log('Starting data population process...');
  
  try {
    // Run all scrapers and collect results
    const results = await scraperManager.runAllScrapers();
    
    console.log('All scrapers completed with results:', results);
    return results;
  } catch (error) {
    console.error('Error during data population:', error);
    return false;
  }
}

// Export for use in server
export { populateAllData };

// If this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check for --schedule flag to determine whether to run immediately or schedule
  const scheduleFlag = process.argv.includes('--schedule');
  
  if (scheduleFlag) {
    console.log('Setting up monthly scraper schedule...');
    
    // Schedule to run on the first day of each month at 00:01
    cron.schedule('1 0 1 * *', async () => {
      console.log(`Running scheduled data population at ${new Date().toISOString()}`);
      await populateAllData();
    });
    
    console.log('Scraper scheduled to run on the first day of each month at 00:01');
  } else {
    console.log('Running data population immediately...');
    populateAllData()
      .then(() => {
        console.log('Data population completed');
        
        // Exit if not in schedule mode
        if (!scheduleFlag) {
          process.exit(0);
        }
      })
      .catch(error => {
        console.error(`Error: ${error.message}`);
        
        // Exit with error code if not in schedule mode
        if (!scheduleFlag) {
          process.exit(1);
        }
      });
  }
}