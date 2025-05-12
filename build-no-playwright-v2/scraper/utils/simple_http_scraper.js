/**
 * HTTP-Only Scraper
 * 
 * A lightweight scraper using fetch API for HTTP requests without any browser dependencies.
 * This is a simplified deployment-friendly alternative.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

// Simple HTML parser function that doesn't rely on cheerio
const parseHtml = (html, selector) => {
  const matches = [];
  const regex = new RegExp(`<${selector}[^>]*>(.*?)</${selector}>`, 'gs');
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
};

// Simplified HTTP request function
const httpGet = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, {
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve(data);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

class SimpleHttpScraper {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }
  
  /**
   * Fetch a page via HTTP request
   */
  async fetchPage(url) {
    try {
      this.logger.log(`Fetching ${url}`);
      const html = await httpGet(url);
      this.logger.log(`Successfully fetched ${url}`);
      return html;
    } catch (error) {
      this.logger.log(`Error fetching ${url}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Extract data using simple selectors
   */
  extract(html, selector) {
    if (!html) return [];
    return parseHtml(html, selector);
  }
  
  /**
   * Download a file via HTTP request
   */
  async downloadFile(url, outputPath) {
    try {
      this.logger.log(`Downloading file from ${url}`);
      
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Download the file
      const fileData = await httpGet(url);
      
      // Write to file
      fs.writeFileSync(outputPath, fileData);
      
      this.logger.log(`Successfully downloaded file to ${outputPath}`);
      return true;
    } catch (error) {
      this.logger.log(`Error downloading file: ${error.message}`);
      return false;
    }
  }
}

export { SimpleHttpScraper };
