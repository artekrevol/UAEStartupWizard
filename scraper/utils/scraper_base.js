// scraper/utils/scraper_base.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import pg from 'pg';
const { Pool } = pg;

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Base scraper class with utility methods for robust web scraping
 */
class BaseScraper {
  constructor(options = {}) {
    this.axios = axios.create({
      timeout: options.timeout || 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
        maxVersion: "TLSv1.3"
      }),
      maxRedirects: 10,
      validateStatus: (status) => status < 500
    });
    
    this.pool = pool;
    this.retryCount = options.retryCount || 3;
    this.retryDelay = options.retryDelay || 2000;
  }
  
  /**
   * Fetches a URL with built-in retry logic and error handling
   */
  async fetchUrl(url, options = {}) {
    let attempt = 0;
    
    while (attempt < this.retryCount) {
      try {
        console.log(`Fetching URL: ${url} (Attempt ${attempt + 1}/${this.retryCount})`);
        const response = await this.axios.get(url, options);
        
        // If we get a successful response, return the data
        if (response.status >= 200 && response.status < 300) {
          console.log(`Successfully fetched ${url}`);
          return response.data;
        }
        
        // Handle redirects
        if (response.status >= 300 && response.status < 400 && response.headers.location) {
          console.log(`Following redirect from ${url} to ${response.headers.location}`);
          return this.fetchUrl(response.headers.location, options);
        }
        
        // Client or server error
        console.log(`Received status ${response.status} from ${url}`);
        attempt++;
        
        if (attempt < this.retryCount) {
          await this.sleep(this.retryDelay);
        }
      } catch (error) {
        console.error(`Error fetching ${url}: ${error.message}`);
        attempt++;
        
        if (attempt < this.retryCount) {
          await this.sleep(this.retryDelay);
        }
      }
    }
    
    // If we've exhausted all retries, return null
    console.error(`Failed to fetch ${url} after ${this.retryCount} attempts`);
    return null;
  }
  
  /**
   * Parses HTML into a cheerio object for easy DOM manipulation
   */
  parseHtml(html) {
    if (!html) return null;
    return cheerio.load(html);
  }
  
  /**
   * Extracts text from an element, with cleaning and optional trimming
   */
  extractText($, element, selector = null, clean = true) {
    let textContent;
    
    if (selector) {
      textContent = $(element).find(selector).text();
    } else {
      textContent = $(element).text();
    }
    
    if (clean) {
      return this.cleanText(textContent);
    }
    
    return textContent;
  }
  
  /**
   * Cleans text by removing extra whitespace, newlines, etc.
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
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
    // Release the pool resources
    if (this.pool) {
      await this.pool.end();
    }
  }
}

export { BaseScraper };