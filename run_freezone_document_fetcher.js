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

const { downloadFreeZoneDocuments, downloadAllFreeZoneDocuments } = require('./scraper/generic_freezone_document_downloader');
const { processFreeZoneDocuments, processAllFreeZoneDocuments } = require('./process-generic-freezone-docs');
const fs = require('fs');
const path = require('path');

/**
 * Run the complete document fetch and process flow for a specific free zone
 */
async function runForFreeZone(freeZoneId) {
  console.log(`\n======= Starting document fetch and process for free zone ID: ${freeZoneId} =======\n`);
  
  try {
    // Step 1: Download documents
    console.log('Step 1: Downloading documents...');
    const downloadResult = await downloadFreeZoneDocuments(freeZoneId);
    
    if (!downloadResult.success) {
      console.error(`Download failed: ${downloadResult.message || downloadResult.error}`);
      return { success: false, stage: 'download', error: downloadResult.message || downloadResult.error };
    }
    
    console.log(`Download completed successfully. Downloaded ${downloadResult.totalDocuments} documents.`);
    
    // Step 2: Process documents
    console.log('\nStep 2: Processing and importing documents...');
    const processResult = await processFreeZoneDocuments(freeZoneId);
    
    if (!processResult.success) {
      console.error(`Processing failed: ${processResult.message || processResult.error}`);
      return { 
        success: false, 
        stage: 'process', 
        error: processResult.message || processResult.error,
        downloadResult
      };
    }
    
    console.log(`Processing completed successfully. Imported ${processResult.results.imported} documents.`);
    
    // Final results
    const finalResult = {
      success: true,
      freeZoneId,
      freeZoneName: downloadResult.freeZoneName,
      downloaded: downloadResult.totalDocuments,
      imported: processResult.results.imported,
      skipped: processResult.results.skipped,
      errors: processResult.results.errors,
      documentsByCategory: processResult.results.documentsByCategory
    };
    
    // Save result to file
    const resultDir = path.resolve('./freezone_docs/results');
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(resultDir, `freezone_${freeZoneId}_result.json`),
      JSON.stringify(finalResult, null, 2)
    );
    
    console.log(`\n======= Completed document fetch and process for ${finalResult.freeZoneName} =======\n`);
    return finalResult;
    
  } catch (error) {
    console.error('Error running document fetch and process:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Run the complete document fetch and process flow for all free zones
 */
async function runForAllFreeZones() {
  console.log('\n======= Starting document fetch and process for ALL free zones =======\n');
  
  try {
    // Step 1: Download documents from all free zones
    console.log('Step 1: Downloading documents from all free zones...');
    const downloadResult = await downloadAllFreeZoneDocuments();
    
    if (!downloadResult.success) {
      console.error(`Download failed: ${downloadResult.message || downloadResult.error}`);
      return { success: false, stage: 'download', error: downloadResult.message || downloadResult.error };
    }
    
    console.log(`Download completed. Downloaded ${downloadResult.totalDocumentsDownloaded} documents from ${downloadResult.totalFreeZones} free zones.`);
    
    // Step 2: Process documents for all free zones
    console.log('\nStep 2: Processing and importing documents for all free zones...');
    const processResult = await processAllFreeZoneDocuments();
    
    if (!processResult.success) {
      console.error(`Processing failed: ${processResult.message || processResult.error}`);
      return { 
        success: false, 
        stage: 'process', 
        error: processResult.message || processResult.error,
        downloadResult
      };
    }
    
    console.log(`Processing completed. Imported ${processResult.totalDocumentsImported} documents from ${processResult.totalFreeZones} free zones.`);
    
    // Final results
    const finalResult = {
      success: true,
      totalFreeZones: downloadResult.totalFreeZones,
      totalDownloaded: downloadResult.totalDocumentsDownloaded,
      totalImported: processResult.totalDocumentsImported,
      successfulDownloads: downloadResult.successfulDownloads,
      successfulImports: processResult.successfulImports,
      failedDownloads: downloadResult.failedDownloads,
      failedImports: processResult.failedImports,
      timestamp: new Date().toISOString(),
      freeZoneResults: downloadResult.results.map(downloadItem => {
        const processItem = processResult.results.find(
          p => p.freeZoneId === downloadItem.freeZoneId
        );
        
        return {
          freeZoneId: downloadItem.freeZoneId,
          freeZoneName: downloadItem.freeZoneName,
          downloadSuccess: downloadItem.success,
          downloadCount: downloadItem.totalDocuments || 0,
          importSuccess: processItem?.success || false,
          importCount: processItem?.imported || 0,
          skipped: processItem?.skipped || 0,
          errors: processItem?.errors || 0
        };
      })
    };
    
    // Save result to file
    const resultDir = path.resolve('./freezone_docs/results');
    if (!fs.existsSync(resultDir)) {
      fs.mkdirSync(resultDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(resultDir, `all_freezones_result_${Date.now()}.json`),
      JSON.stringify(finalResult, null, 2)
    );
    
    console.log(`\n======= Completed document fetch and process for ALL free zones =======\n`);
    return finalResult;
    
  } catch (error) {
    console.error('Error running document fetch and process for all free zones:', error);
    return { success: false, error: error.message };
  }
}

// If running as main script
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && !isNaN(parseInt(args[0]))) {
    // Run for specific free zone
    const freeZoneId = parseInt(args[0]);
    runForFreeZone(freeZoneId)
      .then(result => {
        console.log('Operation complete');
        process.exit(0);
      })
      .catch(error => {
        console.error('Operation failed:', error);
        process.exit(1);
      });
  } else {
    // Run for all free zones
    runForAllFreeZones()
      .then(result => {
        console.log('Operation complete');
        process.exit(0);
      })
      .catch(error => {
        console.error('Operation failed:', error);
        process.exit(1);
      });
  }
}

module.exports = {
  runForFreeZone,
  runForAllFreeZones
};