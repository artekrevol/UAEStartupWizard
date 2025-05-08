/**
 * Scraper Configuration
 * 
 * This module provides configuration settings for all scrapers
 * with special handling for production environments
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const forceHTTPOnly = process.env.SCRAPER_HTTP_ONLY_MODE === 'true';

// Configuration object
const config = {
  // Force HTTP-only mode in production or when explicitly set
  httpOnlyMode: isProduction || forceHTTPOnly,

  // Base URLs
  baseURLs: {
    dmcc: 'https://www.dmcc.ae',
    saifZone: 'https://www.saif-zone.com',
    ajmanFreeZone: 'https://www.afz.ae',
    moec: 'https://www.moec.gov.ae',
  },

  // File system paths
  paths: {
    screenshots: resolve(__dirname, '..', 'screenshots'),
    downloads: resolve(__dirname, '..', 'downloads') // Added downloads path from edited config
    // dmccDocs: resolve(__dirname, '..', 'dmcc_docs'),  //Removed as not in edited
    // saifZoneDocs: resolve(__dirname, '..', 'saif_zone_docs'), //Removed as not in edited
    // freezoneDocs: resolve(__dirname, '..', 'freezone_docs'),  //Removed as not in edited

  },

  // HTTP request configuration
  http: {
    timeout: 30000,
    retries: 3,
    retryDelay: 2000, // Updated retryDelay from edited config
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
  },


  // Operation modes
  modes: {
    downloadDocuments: true,
    extractMetadata: true,
    saveScreenshots: false,
  },

  // Rate limiting to avoid being blocked
  rateLimit: {
    requestsPerMinute: 20,
    concurrentRequests: 2,
    delayBetweenRequests: 3000,
  },

  // Mock data for use when connection fails or in tests
  mockDataEnabled: true,
  mockDataPath: resolve(__dirname, 'mock_data'),

  // Create necessary directories
  ensureDirectoriesExist() {
    const dirs = Object.values(this.paths);
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });

    if (this.mockDataEnabled && !fs.existsSync(this.mockDataPath)) {
      fs.mkdirSync(this.mockDataPath, { recursive: true });
    }
  }
};

// Ensure all required directories exist
config.ensureDirectoriesExist();

// Log configuration mode
console.log(`[Scraper Manager] Running in ${config.httpOnlyMode ? 'HTTP-only' : 'browser-based'} mode`);
if (config.httpOnlyMode) {
  console.log('[Scraper Manager] Running in HTTP-only mode, browser-based scrapers disabled');
}

export default config;