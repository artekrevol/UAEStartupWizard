/**
 * Base scraper class with utility methods for robust web scraping
 */
import axios from 'axios';
import cheerio from 'cheerio';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class BaseScraper {
  constructor(options = {}) {
    // Base options
    this.baseUrl = options.baseUrl || '';
    this.retryCount = options.retryCount || 3;
    this.retryDelay = options.retryDelay || 2000;
    this.timeout = options.timeout || 30000;
    this.delayBetweenRequests = options.delayBetweenRequests || 1000;
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36';
    
    // Database pool
    this.pool = null;
    
    // Create pool connection if DATABASE_URL is available
    if (process.env.DATABASE_URL) {
      this.createPool();
    }
  }
  
  /**
   * Creates a database connection pool
   */
  createPool() {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20, // Maximum number of connections in the pool
        idleTimeoutMillis: 30000, // How long a connection is idle before timing out
        connectionTimeoutMillis: 2000, // How long to try connecting
      });
      
      this.pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
      });
    }
    
    return this.pool;
  }
  
  /**
   * Fetches a URL with built-in retry logic and error handling
   */
  async fetchUrl(url, options = {}) {
    const maxRetries = options.retries || this.retryCount;
    const timeout = options.timeout || this.timeout;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching ${url} (attempt ${attempt}/${maxRetries})...`);
        
        // Add a delay between retries
        if (attempt > 1) {
          await this.sleep(this.retryDelay * attempt);
        }
        
        const response = await axios.get(url, {
          timeout,
          headers: {
            'User-Agent': this.userAgent,
            ...options.headers
          },
          ...options.axiosOptions
        });
        
        // Delay before the next request to avoid rate limiting
        await this.sleep(this.delayBetweenRequests);
        
        return response.data;
      } catch (error) {
        console.error(`Error fetching ${url} (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt === maxRetries) {
          console.error('Max retries reached, giving up');
          return null;
        }
      }
    }
    
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
    try {
      let text;
      
      if (selector) {
        text = $(element).find(selector).text();
      } else {
        text = $(element).text();
      }
      
      return clean ? this.cleanText(text) : text;
    } catch (error) {
      console.error('Error extracting text:', error.message);
      return '';
    }
  }
  
  /**
   * Cleans text by removing extra whitespace, newlines, etc.
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\\n/g, ' ')           // Replace escaped newlines
      .replace(/\n+/g, ' ')           // Replace actual newlines
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .replace(/&nbsp;/g, ' ')        // Replace non-breaking spaces
      .replace(/\t+/g, ' ')           // Replace tabs
      .trim();                        // Trim leading/trailing spaces
  }
  
  /**
   * Safely executes a database query with error handling
   */
  async executeQuery(query, params = []) {
    if (!this.pool) {
      this.createPool();
    }
    
    let client;
    
    try {
      client = await this.pool.connect();
      const result = await client.query(query, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error.message);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
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
    if (match && match[groupIndex] !== undefined) {
      return match[groupIndex];
    }
    
    return null;
  }
  
  /**
   * Handle cleanup operations
   */
  async cleanup() {
    try {
      // Close database connection pool if it exists
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

export { BaseScraper };