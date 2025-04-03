/**
 * Script to run the SAIF Zone Business Setup scraper
 * 
 * This script focuses specifically on extracting comprehensive information
 * about the business setup process in SAIF Zone (Sharjah Airport International Free Zone)
 * 
 * Usage: node run_saif_zone_business_setup_scraper.js
 */

import { scrapeSAIFZoneBusinessSetup } from './scraper/saif_zone_business_setup_scraper.js';

async function main() {
  try {
    console.log('Starting SAIF Zone Business Setup scraping process...');
    const result = await scrapeSAIFZoneBusinessSetup();
    
    if (result.success) {
      console.log('SAIF Zone Business Setup data successfully extracted and processed!');
      console.log('The following documents have been created:');
      console.log('- saif_zone_docs/business_setup/business_setup_overview.txt');
      console.log('- saif_zone_docs/business_setup/company_formation_process.txt');
      console.log('- saif_zone_docs/business_setup/license_types.txt');
      console.log('- saif_zone_docs/business_setup/legal_structures.txt');
      console.log('- saif_zone_docs/business_setup/package_options.txt');
      console.log('- saif_zone_docs/business_setup/saif_zone_business_setup.json');
      console.log('\nThe free zone entry in the database has been updated with this information');
      console.log('An establishment guide has also been created/updated');
    } else {
      console.error('Error during SAIF Zone Business Setup scraping:', result.error);
    }
  } catch (error) {
    console.error('Error running SAIF Zone Business Setup scraper:', error);
  }
}

// Run the main function
main();