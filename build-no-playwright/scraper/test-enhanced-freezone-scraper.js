/**
 * Simple test script to run the enhanced freezone scraper manually
 * Usage: node test-enhanced-freezone-scraper.js
 * 
 * This script will:
 * 1. Update the website URLs for free zones
 * 2. Attempt to scrape detailed information from each free zone website
 * 3. Update the database with structured information about each free zone
 */

import { runEnhancedFreeZoneScraper } from './enhanced_freezone_scraper.js';

async function main() {
  try {
    console.log('Starting Enhanced Free Zone Scraper...');
    
    const options = {
      headless: process.argv.includes('--visible') ? false : true,
      screenshots: process.argv.includes('--screenshots') ? true : false,
      timeout: 60000, // 60 seconds timeout
      retryCount: 2   // Retry navigation twice
    };
    
    console.log('Options:', options);
    
    const result = await runEnhancedFreeZoneScraper(options);
    
    if (result) {
      console.log('Enhanced Free Zone Scraper completed successfully!');
    } else {
      console.log('Enhanced Free Zone Scraper completed with some errors. Check logs for details.');
    }
  } catch (error) {
    console.error('Error running Enhanced Free Zone Scraper:', error);
  }
}

// Run the script
main()
  .then(() => {
    console.log('Script execution completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });