/**
 * Unified script to fetch and process documents from all free zones
 * 
 * This script:
 * 1. Downloads documents from free zone websites using the generic downloader
 * 2. Processes and imports the downloaded documents to the database
 * 3. Generates a comprehensive report of the operation
 * 
 * Usage:
 *   - For all free zones: node run_freezone_document_fetcher.js
 *   - For a specific free zone: node run_freezone_document_fetcher.js <freeZoneId>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import { processAllFreeZoneDocuments, processFreeZoneDocuments } from './process-generic-freezone-docs.js';

// Import functions using dynamic import since this file is run as ESM
const loadDependencies = async () => {
  try {
    // Use dynamic import for generic_freezone_document_downloader.js
    const downloaderModule = await import('./scraper/generic_freezone_document_downloader.js');
    const { downloadFreeZoneDocuments, downloadAllFreeZoneDocuments } = downloaderModule;
    
    // Use dynamic import for db.js
    const dbModule = await import('./server/db.js');
    const { db } = dbModule;
    
    // Get free zone ID from command line argument
    const freeZoneId = process.argv[2] ? parseInt(process.argv[2]) : null;
    
    if (freeZoneId) {
      await runForFreeZone(freeZoneId, db, downloadFreeZoneDocuments);
    } else {
      await runForAllFreeZones(db, downloadAllFreeZoneDocuments);
    }
  } catch (error) {
    console.error('Error loading dependencies:', error);
    process.exit(1);
  }
};

/**
 * Run the complete document fetch and process flow for a specific free zone
 */
async function runForFreeZone(freeZoneId, db, downloadFreeZoneDocuments) {
  try {
    console.log(`Starting document fetching for free zone ID ${freeZoneId}`);
    
    // Get free zone details
    const freeZoneResult = await db.execute(`
      SELECT id, name, website FROM free_zones WHERE id = ${freeZoneId}
    `);
    
    if (!freeZoneResult.rows || freeZoneResult.rows.length === 0) {
      console.error(`Free zone with ID ${freeZoneId} not found`);
      process.exit(1);
    }
    
    const freeZone = freeZoneResult.rows[0];
    
    if (!freeZone.website) {
      console.error(`Free zone ${freeZone.name} has no website URL`);
      process.exit(1);
    }
    
    console.log(`Found free zone: ${freeZone.name}, website: ${freeZone.website}`);
    
    // Create directories if they don't exist
    const baseDir = path.resolve('./freezone_docs');
    const freeZoneDir = path.join(baseDir, freeZone.name.toLowerCase().replace(/\s+/g, '_'));
    const resultsDir = path.join(baseDir, 'results');
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    if (!fs.existsSync(freeZoneDir)) {
      fs.mkdirSync(freeZoneDir, { recursive: true });
    }
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Download documents
    console.log(`Starting document download for ${freeZone.name}...`);
    const downloadResult = await downloadFreeZoneDocuments(freeZoneId, freeZone.name, freeZone.website);
    
    // Write download result to file
    const resultPath = path.join(resultsDir, `freezone_${freeZoneId}_result.json`);
    fs.writeFileSync(resultPath, JSON.stringify(downloadResult, null, 2));
    
    console.log(`Download completed. Found ${downloadResult.documents.length} documents.`);
    console.log(`Download summary saved to ${resultPath}`);
    
    // Process and import documents
    console.log(`Starting document processing for ${freeZone.name}...`);
    const processingResult = await processFreeZoneDocuments(freeZoneId, freeZoneDir);
    
    // Update the result file with processing information
    downloadResult.processing = processingResult;
    fs.writeFileSync(resultPath, JSON.stringify(downloadResult, null, 2));
    
    console.log(`Document processing completed for ${freeZone.name}`);
    console.log(`Total documents found: ${downloadResult.documents.length}`);
    console.log(`Documents imported: ${processingResult.successCount}`);
    console.log(`Documents skipped: ${processingResult.skippedCount}`);
    console.log(`Errors: ${processingResult.errorCount}`);
    
    return {
      freeZoneId,
      freeZoneName: freeZone.name,
      documentsFound: downloadResult.documents.length,
      documentsImported: processingResult.successCount,
      documentsSkipped: processingResult.skippedCount,
      errors: processingResult.errorCount,
      success: true
    };
  } catch (error) {
    console.error(`Error running document fetcher for free zone ID ${freeZoneId}:`, error);
    return {
      freeZoneId,
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Run the complete document fetch and process flow for all free zones
 */
async function runForAllFreeZones(db, downloadAllFreeZoneDocuments) {
  try {
    console.log('Starting document fetching for all free zones with websites');
    
    // Get all free zones with websites
    const freeZonesResult = await db.execute(`
      SELECT id, name, website FROM free_zones 
      WHERE website IS NOT NULL AND website != '' 
      ORDER BY name
    `);
    
    if (!freeZonesResult.rows || freeZonesResult.rows.length === 0) {
      console.error('No free zones with websites found');
      process.exit(1);
    }
    
    console.log(`Found ${freeZonesResult.rows.length} free zones with websites`);
    
    // Create directories if they don't exist
    const baseDir = path.resolve('./freezone_docs');
    const resultsDir = path.join(baseDir, 'results');
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Download documents for all free zones
    console.log('Starting document download for all free zones...');
    const downloadResult = await downloadAllFreeZoneDocuments(freeZonesResult.rows);
    
    // Write download result to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultPath = path.join(resultsDir, `all_freezones_result_${timestamp}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(downloadResult, null, 2));
    
    console.log('Download completed for all free zones');
    console.log(`Downloaded documents for ${downloadResult.freeZones.length} free zones`);
    console.log(`Download summary saved to ${resultPath}`);
    
    // Process and import documents for all free zones
    console.log('Starting document processing for all free zones...');
    const processingResult = await processAllFreeZoneDocuments();
    
    // Update the result file with processing information
    downloadResult.processing = processingResult;
    fs.writeFileSync(resultPath, JSON.stringify(downloadResult, null, 2));
    
    console.log('Document processing completed for all free zones');
    console.log(`Free zones processed: ${processingResult.freeZones.length}`);
    console.log(`Total documents imported: ${processingResult.totalSuccessCount}`);
    console.log(`Total documents skipped: ${processingResult.totalSkippedCount}`);
    console.log(`Total errors: ${processingResult.totalErrorCount}`);
    
    return {
      freeZones: processingResult.freeZones,
      totalFreeZones: processingResult.freeZones.length,
      totalDocumentsImported: processingResult.totalSuccessCount,
      totalDocumentsSkipped: processingResult.totalSkippedCount,
      totalErrors: processingResult.totalErrorCount,
      success: true
    };
  } catch (error) {
    console.error('Error running document fetcher for all free zones:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run the script
loadDependencies().catch(error => {
  console.error('Error running document fetcher:', error);
  process.exit(1);
});