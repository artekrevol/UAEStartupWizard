/**
 * HTTP-Only Scraper
 * 
 * A lightweight scraper using axios for HTTP requests without browser dependencies.
 * This is a deployment-friendly alternative to Playwright-based scrapers.
 */

import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { constants } from 'crypto';

// Configure axios with robust SSL settings
const createAxiosInstance = () => {
  return axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
      maxVersion: "TLSv1.3",
      ciphers: "HIGH:!aNULL:!MD5:!RC4",
      honorCipherOrder: true,
      secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_RENEGOTIATION
    }),
    timeout: 30000, // 30 seconds timeout
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    }
  });
};

// Fallback axios with even more permissive settings
const createFallbackAxiosInstance = () => {
  return axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
      maxVersion: "TLSv1.3",
      minVersion: "TLSv1",
      ciphers: "ALL",
      secureOptions: constants.SSL_OP_NO_RENEGOTIATION
    }),
    timeout: 60000, // Longer timeout
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Accept': '*/*',
      'Connection': 'close'
    },
    maxRedirects: 10,
    validateStatus: function (status) {
      return status >= 200 && status < 500; // Accept all non-server errors
    }
  });
};

// Direct HTTPS request (final fallback method)
const makeDirectHttpsRequest = (url, logger) => {
  return new Promise((resolve, reject) => {
    logger.log(`Making direct HTTPS request to ${url}`);
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
        'Accept': '*/*',
        'Accept-Language': 'en',
        'Connection': 'close'
      },
      timeout: 90000 // 90 seconds timeout
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        logger.log(`Successfully received direct HTTPS response from ${url}`);
        resolve(data);
      });
    });
    
    req.on('error', (error) => {
      logger.log(`Error in direct HTTPS request: ${error.message}`);
      reject(error);
    });
    
    req.on('timeout', () => {
      logger.log(`Direct HTTPS request timed out`);
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.end();
  });
};

class HttpOnlyScraper {
  constructor(options = {}) {
    this.options = options;
    this.axiosInstance = createAxiosInstance();
    this.fallbackAxiosInstance = createFallbackAxiosInstance();
    this.logger = options.logger || console;
  }

  /**
   * Fetch a page via HTTP request
   * @param {string} url URL to fetch
   * @returns {Promise<string>} HTML content
   */
  async fetchPage(url) {
    try {
      this.logger.log(`Fetching ${url}`);
      const response = await this.axiosInstance.get(url);
      this.logger.log(`Successfully fetched ${url}`);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.log(`Error fetching ${url}: ${errorMessage}`);
      
      // Try with fallback configuration
      try {
        this.logger.log(`Retrying ${url} with fallback configuration`);
        const response = await this.fallbackAxiosInstance.get(url);
        this.logger.log(`Successfully fetched ${url} with fallback configuration`);
        return response.data;
      } catch (retryError) {
        const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
        this.logger.log(`Failed with fallback approach: ${retryErrorMessage}`);
        
        // Try with direct HTTPS request as last resort
        try {
          this.logger.log(`Making last attempt with direct HTTPS request to ${url}`);
          const html = await makeDirectHttpsRequest(url, this.logger);
          if (html) {
            this.logger.log(`Successfully fetched ${url} with direct HTTPS request`);
            return html;
          }
        } catch (directError) {
          const directErrorMessage = directError instanceof Error ? directError.message : String(directError);
          this.logger.log(`Failed with direct HTTPS request: ${directErrorMessage}`);
        }
        
        return null;
      }
    }
  }

  /**
   * Extract data from HTML using cheerio
   * @param {string} html HTML content
   * @param {Function} extractionFn Function to extract data using cheerio
   * @returns {any} Extracted data
   */
  extract(html, extractionFn) {
    if (!html) return null;
    
    const $ = cheerio.load(html);
    return extractionFn($);
  }

  /**
   * Download a file via HTTP request
   * @param {string} url URL to download
   * @param {string} outputPath Path to save the file
   * @returns {Promise<boolean>} Success status
   */
  async downloadFile(url, outputPath) {
    try {
      this.logger.log(`Downloading file from ${url}`);
      
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Get the file content
      const response = await this.axiosInstance.get(url, { responseType: 'arraybuffer' });
      
      // Write to file
      fs.writeFileSync(outputPath, response.data);
      
      this.logger.log(`Successfully downloaded file to ${outputPath}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.log(`Error downloading file: ${errorMessage}`);
      
      // Try with fallback configuration
      try {
        this.logger.log(`Retrying download with fallback configuration`);
        const response = await this.fallbackAxiosInstance.get(url, { responseType: 'arraybuffer' });
        fs.writeFileSync(outputPath, response.data);
        this.logger.log(`Successfully downloaded file with fallback configuration`);
        return true;
      } catch (retryError) {
        const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
        this.logger.log(`Failed to download with fallback approach: ${retryErrorMessage}`);
        
        // Try with direct HTTPS request as last resort for downloading
        try {
          this.logger.log(`Making last attempt with direct HTTPS request to download ${url}`);
          const data = await makeDirectHttpsRequest(url, this.logger);
          if (data) {
            // For non-binary data, we save as-is (text/html)
            fs.writeFileSync(outputPath, data);
            this.logger.log(`Successfully downloaded file with direct HTTPS request`);
            return true;
          }
        } catch (directError) {
          const directErrorMessage = directError instanceof Error ? directError.message : String(directError);
          this.logger.log(`Failed with direct HTTPS download: ${directErrorMessage}`);
        }
        
        return false;
      }
    }
  }
  
  /**
   * Submit a form via HTTP POST request
   * @param {string} url URL to submit to
   * @param {Object} formData Form data to submit
   * @returns {Promise<any>} Response data
   */
  async submitForm(url, formData) {
    try {
      this.logger.log(`Submitting form to ${url}`);
      const response = await this.axiosInstance.post(url, formData);
      this.logger.log(`Successfully submitted form to ${url}`);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.log(`Error submitting form: ${errorMessage}`);
      
      // Try with fallback configuration
      try {
        this.logger.log(`Retrying form submission with fallback configuration`);
        const response = await this.fallbackAxiosInstance.post(url, formData);
        this.logger.log(`Successfully submitted form with fallback configuration`);
        return response.data;
      } catch (retryError) {
        const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
        this.logger.log(`Failed to submit form with fallback approach: ${retryErrorMessage}`);
        return null;
      }
    }
  }
}

export { HttpOnlyScraper };