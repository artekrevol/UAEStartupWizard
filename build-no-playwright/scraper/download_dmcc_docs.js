/**
 * Script to run DMCC document downloaders
 * 
 * This script downloads documents from the DMCC knowledge bank pages
 * and stores them in structured folders for AI training purposes.
 */

import { scraperManager } from './scraper_manager.js';
import fs from 'fs';
import path from 'path';

// Configuration
const OUTPUT_DIR = './dmcc_docs';
const SUMMARY_FILE = path.join(OUTPUT_DIR, 'download_summary.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Main function to run all DMCC document downloaders
 */
async function downloadDMCCDocuments() {
  console.log('Starting DMCC document download process...');
  
  const results = {
    timestamp: new Date().toISOString(),
    downloaders: {}
  };
  
  try {
    // Get all DMCC document downloaders
    const dmccDownloaders = ['dmcc-business-docs', 'dmcc-browser-docs'];
    
    // Run each downloader
    for (const downloader of dmccDownloaders) {
      console.log(`Running ${downloader}...`);
      
      try {
        const result = await scraperManager.runScraper(downloader);
        results.downloaders[downloader] = {
          success: result.success,
          totalDocuments: result.totalDocuments || 0,
          downloadedDocuments: result.downloadedDocuments || 0,
          outputDirectory: result.outputDirectory || null,
          error: result.error || null
        };
        
        console.log(`${downloader} completed with ${result.success ? 'success' : 'failure'}`);
        if (result.success) {
          console.log(`Downloaded ${result.downloadedDocuments} of ${result.totalDocuments} documents`);
        }
      } catch (error) {
        console.error(`Error running ${downloader}:`, error);
        results.downloaders[downloader] = {
          success: false,
          error: error.message
        };
      }
    }
    
    // Write summary
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(results, null, 2));
    console.log(`Download summary written to ${SUMMARY_FILE}`);
    
    // Calculate success stats
    const totalSuccess = Object.values(results.downloaders)
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.downloadedDocuments || 0), 0);
    
    const totalDocuments = Object.values(results.downloaders)
      .reduce((sum, r) => sum + (r.totalDocuments || 0), 0);
    
    console.log(`Download process complete.`);
    console.log(`Total documents downloaded: ${totalSuccess} of ${totalDocuments}`);
    
    return {
      success: true,
      totalDocuments,
      downloadedDocuments: totalSuccess
    };
  } catch (error) {
    console.error('Error in document download process:', error);
    results.error = error.message;
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(results, null, 2));
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadDMCCDocuments()
    .then(result => {
      if (result.success) {
        console.log('DMCC document download process completed successfully');
        process.exit(0);
      } else {
        console.error('DMCC document download process failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unexpected error during DMCC document download process:', err);
      process.exit(1);
    });
}

export { downloadDMCCDocuments };