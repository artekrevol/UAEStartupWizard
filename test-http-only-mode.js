/**
 * Test script to verify HTTP-only mode configuration for the scraper service
 * 
 * Run with: node test-http-only-mode.js
 */

import { scraperManager } from './scraper/scraper_manager.js';
import { scraperConfig } from './scraper/config.js';

console.log('=== Scraper HTTP-Only Mode Test ===\n');

// Check configuration
console.log('Current configuration:');
console.log('- HTTP-only mode:', scraperConfig.httpOnlyMode ? 'Enabled' : 'Disabled');
console.log('- Memory cache fallback:', scraperConfig.useMemoryCacheForRedis ? 'Enabled' : 'Disabled');
console.log('- Max retries:', scraperConfig.maxRetries);
console.log('- Retry delay:', scraperConfig.retryDelay, 'ms');
console.log('- Timeout:', scraperConfig.timeout, 'ms');
console.log();

// Get available scrapers from ScraperManager
const availableScrapers = scraperManager.getAvailableScrapers();
console.log('Available scrapers in current mode:');
availableScrapers.forEach(scraper => console.log(`- ${scraper}`));
console.log();

// In HTTP-only mode, verify we don't have browser-based scrapers
if (scraperConfig.httpOnlyMode) {
  const browserScrapers = [
    'uaegovportal',
    'enhanced_freezones',
    'dmcc-browser-docs'
  ];

  const foundBrowserScrapers = browserScrapers.filter(scraper => 
    availableScrapers.includes(scraper)
  );

  if (foundBrowserScrapers.length === 0) {
    console.log('✅ Success: No browser-based scrapers available in HTTP-only mode');
  } else {
    console.log('❌ Error: The following browser-based scrapers are still available:');
    foundBrowserScrapers.forEach(scraper => console.log(`- ${scraper}`));
  }
}

console.log('\n=== Test completed ===');