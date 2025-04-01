// scraper/utils/scraper_base.js
import pkg from 'pg';
const { Pool } = pkg;
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Base scraper class with utility methods for robust web scraping
 */
class BaseScraper {
  constructor(options = {}) {
    this.options = {
      retryCount: 3,
      retryDelay: 2000,
      timeout: 30000,
      ...options
    };
    
    // If a database connection is provided, use it; otherwise create one
    this.pool = options.pool || this.createPool();
    
    // User agent rotation for more realistic requests
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0'
    ];
  }
  
  /**
   * Creates a database connection pool
   */
  createPool() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    return pool;
  }
  
  /**
   * Fetches a URL with built-in retry logic and error handling
   */
  async fetchUrl(url, options = {}) {
    const maxRetries = options.retryCount || this.options.retryCount;
    const retryDelay = options.retryDelay || this.options.retryDelay;
    const timeout = options.timeout || this.options.timeout;
    
    // Get a random user agent
    const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching URL: ${url} (Attempt ${attempt}/${maxRetries})`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: timeout,
          ...options
        });
        
        if (response.status === 200) {
          console.log(`Successfully fetched ${url}`);
          return response.data;
        } else {
          console.warn(`Received status code ${response.status} when fetching ${url}`);
        }
      } catch (error) {
        console.error(`Error fetching ${url}: ${error.message}`);
        
        if (attempt < maxRetries) {
          console.log(`Retrying in ${retryDelay / 1000} seconds...`);
          await this.sleep(retryDelay);
        }
      }
    }
    
    console.error(`Failed to fetch ${url} after ${maxRetries} attempts`);
    return null;
  }
  
  /**
   * Parses HTML into a cheerio object for easy DOM manipulation
   */
  parseHtml(html) {
    if (!html) return null;
    
    try {
      return cheerio.load(html);
    } catch (error) {
      console.error(`Error parsing HTML: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Extracts text from an element, with cleaning and optional trimming
   */
  extractText($, element, selector = null, clean = true) {
    try {
      let text;
      
      if (selector) {
        text = $(element).find(selector).text();
      } else {
        text = $(element).text();
      }
      
      return clean ? this.cleanText(text) : text;
    } catch (error) {
      console.error(`Error extracting text: ${error.message}`);
      return '';
    }
  }
  
  /**
   * Cleans text by removing extra whitespace, newlines, etc.
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/[\r\n\t]+/g, ' ')  // Replace newlines and tabs with spaces
      .replace(/\s{2,}/g, ' ')     // Replace multiple spaces with a single space
      .trim();                      // Remove leading/trailing whitespace
  }
  
  /**
   * Safely executes a database query with error handling
   */
  async executeQuery(query, params = []) {
    try {
      const result = await this.pool.query(query, params);
      return result;
    } catch (error) {
      console.error(`Database query error: ${error.message}`);
      console.error(`Query: ${query}`);
      console.error(`Params: ${JSON.stringify(params)}`);
      throw error;
    }
  }
  
  /**
   * Helper method to delay execution
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Safely extracts matched groups from a regex pattern
   */
  extractPattern(text, pattern, groupIndex = 1) {
    if (!text) return null;
    
    const match = text.match(pattern);
    if (match && match[groupIndex]) {
      return match[groupIndex].trim();
    }
    
    return null;
  }
  
  /**
   * Handle cleanup operations
   */
  async cleanup() {
    // We don't close the pool here since it's managed externally
    // and may be reused for other operations
    // This prevents "Cannot use a pool after calling end on the pool" errors
  }
}

export { BaseScraper };