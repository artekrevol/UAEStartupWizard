// scraper/scraper_manager.js
import { scrapeUAEFreeZones } from './scrapers/uae_freezones_scraper.js';
import { scrapeUAEGovernmentPortal } from './scrapers/uae_government_portal_scraper.js';

/**
 * Scraper Manager to orchestrate multiple scrapers
 * Can be expanded to include additional website scrapers
 * Now includes support for Playwright-based scrapers
 */
class ScraperManager {
  constructor() {
    this.scrapers = {
      // Original Cheerio-based scrapers
      'uaefreezones': scrapeUAEFreeZones,
      
      // New Playwright-based scrapers
      'uaegovportal': scrapeUAEGovernmentPortal
    };
    
    // Default options for scrapers
    this.defaultOptions = {
      retryCount: 3,
      retryDelay: 2000,
      timeout: 30000
    };
  }
  
  /**
   * Run a specific scraper by name
   */
  async runScraper(scraperName, options = {}) {
    console.log(`Starting scraper: ${scraperName}`);
    
    if (!this.scrapers[scraperName]) {
      console.error(`Scraper '${scraperName}' not found`);
      return false;
    }
    
    try {
      // Merge default options with provided options
      const scraperOptions = { ...this.defaultOptions, ...options };
      const result = await this.scrapers[scraperName](scraperOptions);
      
      console.log(`Scraper '${scraperName}' completed`);
      return result;
    } catch (error) {
      console.error(`Error running scraper '${scraperName}': ${error.message}`);
      return false;
    }
  }
  
  /**
   * Run all registered scrapers
   */
  async runAllScrapers(options = {}) {
    console.log('Starting all scrapers');
    
    const results = {};
    for (const [name, scraper] of Object.entries(this.scrapers)) {
      console.log(`Running scraper: ${name}`);
      
      try {
        const scraperOptions = { ...this.defaultOptions, ...options };
        results[name] = await scraper(scraperOptions);
      } catch (error) {
        console.error(`Error running scraper '${name}': ${error.message}`);
        results[name] = false;
      }
    }
    
    console.log('All scrapers completed');
    return results;
  }
  
  /**
   * Get list of available scrapers
   */
  getAvailableScrapers() {
    return Object.keys(this.scrapers);
  }
}

// Create a singleton instance
const scraperManager = new ScraperManager();

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetScraper = process.argv[2];
  
  if (targetScraper) {
    console.log(`Running specific scraper: ${targetScraper}`);
    scraperManager.runScraper(targetScraper)
      .then(result => {
        console.log(`Scraper '${targetScraper}' completed with result: ${result}`);
        process.exit(0);
      })
      .catch(error => {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      });
  } else {
    console.log('Running all scrapers');
    scraperManager.runAllScrapers()
      .then(results => {
        console.log('All scrapers completed with results:', results);
        process.exit(0);
      })
      .catch(error => {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      });
  }
}

export { scraperManager, ScraperManager };