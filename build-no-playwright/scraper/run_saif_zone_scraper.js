/**
 * Script to run the SAIF Zone scraper
 * 
 * This script runs the specialized SAIF Zone scraper to extract
 * data from the Sharjah Airport International Free Zone website.
 * 
 * Usage: node scraper/run_saif_zone_scraper.js
 */

const { runSAIFZoneScraper } = require('./saif_zone_scraper');

async function main() {
  console.log('Starting SAIF Zone data extraction...');
  
  try {
    const result = await runSAIFZoneScraper();
    
    if (result.success) {
      console.log('✅ SAIF Zone data extraction completed successfully');
      console.log(`Data saved to saif_zone_docs/saif_zone_data.json`);
    } else {
      console.error('❌ Failed to extract SAIF Zone data:', result.error);
    }
  } catch (error) {
    console.error('❌ Error running SAIF Zone scraper:', error.message);
  }
}

// Run the script
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});