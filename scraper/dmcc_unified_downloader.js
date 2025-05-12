/**
 * DMCC Unified Document Downloader
 * 
 * This module automatically selects the appropriate document downloader
 * based on the environment configuration. In HTTP-only mode, it uses the
 * HTTP-only implementation, otherwise it attempts to use the browser-based one.
 */

// Import HTTP-only downloader
import { downloadDMCCDocuments as httpDownloadDMCCDocuments, downloadAllDMCCDocuments as httpDownloadAllDMCCDocuments } from './dmcc_http_only_downloader.js';

// Check if we're in HTTP-only mode
const isHttpOnlyMode = process.env.SCRAPER_HTTP_ONLY_MODE === 'true' || process.env.USE_HTTP_ONLY_SCRAPER === 'true';

// Dynamic imports based on environment
let browserDownloadDMCCDocuments;
let browserDownloadAllDMCCDocuments;

if (!isHttpOnlyMode) {
  try {
    // Try to import the browser-based downloader
    const module = await import('./dmcc_document_downloader.js');
    browserDownloadDMCCDocuments = module.downloadDMCCDocuments;
    browserDownloadAllDMCCDocuments = module.downloadAllDMCCDocuments;
    console.log('Successfully loaded browser-based DMCC document downloader');
  } catch (error) {
    console.warn('Failed to load browser-based DMCC document downloader:', error.message);
    console.warn('Falling back to HTTP-only implementation');
  }
} else {
  console.log('Running in HTTP-only mode, using HTTP-only DMCC document downloader');
}

/**
 * Downloads DMCC documents using the appropriate method based on environment
 * @param {string} category - The category of documents to download
 * @param {string} baseUrl - The base URL for the document category
 * @param {string} outputDir - Directory to save the documents
 */
export async function downloadDMCCDocuments(category, baseUrl, outputDir) {
  try {
    if (!isHttpOnlyMode && browserDownloadDMCCDocuments) {
      console.log('Using browser-based DMCC document downloader');
      return await browserDownloadDMCCDocuments(category, baseUrl, outputDir);
    } else {
      console.log('Using HTTP-only DMCC document downloader');
      return await httpDownloadDMCCDocuments(category, baseUrl, outputDir);
    }
  } catch (error) {
    console.error('Error in DMCC document download:', error);
    
    // If browser-based download failed, try HTTP-only as a fallback
    if (!isHttpOnlyMode && browserDownloadDMCCDocuments) {
      console.log('Browser-based download failed, trying HTTP-only fallback');
      try {
        return await httpDownloadDMCCDocuments(category, baseUrl, outputDir);
      } catch (fallbackError) {
        console.error('HTTP-only fallback also failed:', fallbackError);
        throw new Error(`Both browser-based and HTTP-only downloads failed: ${error.message} / ${fallbackError.message}`);
      }
    }
    
    throw error;
  }
}

/**
 * Downloads all DMCC document categories using the appropriate method
 */
export async function downloadAllDMCCDocuments() {
  try {
    if (!isHttpOnlyMode && browserDownloadAllDMCCDocuments) {
      console.log('Using browser-based DMCC document downloader for all categories');
      return await browserDownloadAllDMCCDocuments();
    } else {
      console.log('Using HTTP-only DMCC document downloader for all categories');
      return await httpDownloadAllDMCCDocuments();
    }
  } catch (error) {
    console.error('Error in DMCC document download for all categories:', error);
    
    // If browser-based download failed, try HTTP-only as a fallback
    if (!isHttpOnlyMode && browserDownloadAllDMCCDocuments) {
      console.log('Browser-based download failed, trying HTTP-only fallback for all categories');
      try {
        return await httpDownloadAllDMCCDocuments();
      } catch (fallbackError) {
        console.error('HTTP-only fallback also failed for all categories:', fallbackError);
        throw new Error(`Both browser-based and HTTP-only downloads failed for all categories: ${error.message} / ${fallbackError.message}`);
      }
    }
    
    throw error;
  }
}

// Default export for direct execution
export default async function run() {
  console.log('Starting DMCC unified document downloader');
  console.log(`Mode: ${isHttpOnlyMode ? 'HTTP-only' : 'Browser-based with HTTP fallback'}`);
  await downloadAllDMCCDocuments();
  console.log('DMCC unified document downloader completed');
}

// Allow direct execution
if (process.argv[1] === import.meta.url) {
  run().catch(console.error);
}