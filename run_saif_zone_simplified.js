/**
 * Script to run the simplified SAIF Zone scraper
 * 
 * This script uses simplified selectors without :has() pseudo-class 
 * for better compatibility
 * 
 * Usage: node run_saif_zone_simplified.js
 */

import { scrapeSAIFZoneSimplified } from './scraper/saif_zone_scraper_simplified.js';

async function main() {
  try {
    console.log('Starting SAIF Zone scraping process (simplified version)...');
    const result = await scrapeSAIFZoneSimplified();
    
    if (result.success) {
      console.log('SAIF Zone data successfully extracted and processed!');
      console.log('The following documents have been created:');
      console.log('- saif_zone_docs/business_setup/business_setup_overview.txt');
      console.log('- saif_zone_docs/business_setup/company_formation_process.txt');
      console.log('- saif_zone_docs/business_setup/license_types.txt');
      console.log('- saif_zone_docs/business_setup/legal_structures.txt');
      console.log('- saif_zone_docs/business_setup/package_options.txt');
      console.log('- saif_zone_docs/business_setup/saif_zone_business_setup.json');
    } else {
      console.error('Error during SAIF Zone scraping:', result.error);
    }
  } catch (error) {
    console.error('Error running SAIF Zone scraper:', error);
  }
}

// Run the main function
main();