/**
 * Simple test script to run scrapers manually
 * Usage: 
 *   node test-scrapers.js [scraper_name]
 *   If no scraper_name is provided, it will show available scrapers
 */
import { scraperManager } from './scraper_manager.js';

// Get command line args
const scraperName = process.argv[2];

async function main() {
  console.log('Scraper Test Utility');
  console.log('===================');
  
  // Show available scrapers
  const availableScrapers = scraperManager.getAvailableScrapers();
  console.log(`Available scrapers: ${availableScrapers.join(', ')}`);
  
  // If no scraper specified, exit
  if (!scraperName) {
    console.log('\nUsage: node test-scrapers.js [scraper_name]');
    console.log('Example: node test-scrapers.js uaefreezones');
    return;
  }
  
  // Check if specified scraper exists
  if (!availableScrapers.includes(scraperName)) {
    console.error(`Error: Scraper '${scraperName}' not found`);
    return;
  }
  
  console.log(`\nRunning scraper: ${scraperName}`);
  console.log('===================');
  
  // Run the specified scraper with headless=false to see the browser UI
  const options = {
    headless: false,        // Show browser UI
    screenshots: true,      // Take screenshots
    timeout: 60000,         // 60 second timeout
    delayBetweenRequests: 2000 // 2 second delay between requests
  };
  
  try {
    const startTime = Date.now();
    const result = await scraperManager.runScraper(scraperName, options);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`\nScraper '${scraperName}' completed in ${duration.toFixed(2)} seconds`);
    console.log(`Result: ${result ? 'SUCCESS' : 'FAILURE'}`);
  } catch (error) {
    console.error(`\nError running scraper '${scraperName}':`, error);
  }
}

main().catch(error => console.error('Unhandled error:', error));