/**
 * Script to run the comprehensive DMCC Document Downloader
 * This script serves as a simple entry point to run the downloader with CLI feedback
 */

import { downloadAllDMCCDocuments } from './comprehensive_dmcc_downloader.js';

// Run the downloader
console.log('Starting comprehensive DMCC document downloader...');
console.log('This process will crawl the DMCC website and download all available documents.');
console.log('Documents will be organized into categories based on their source pages.');
console.log('--------------------------------------------------------------------');

downloadAllDMCCDocuments()
  .then(result => {
    if (result.success) {
      console.log('========================================================');
      console.log('DMCC document download process completed successfully!');
      console.log('========================================================');
      console.log(`Total documents found: ${result.totalDocuments}`);
      console.log(`Successfully downloaded: ${result.downloadedDocuments} documents`);
      console.log(`Skipped (already existed): ${result.skippedDocuments} documents`);
      console.log(`Failed downloads: ${result.failedDocuments} documents`);
      console.log(`Documents organized across ${result.categories} categories`);
      console.log('');
      console.log('Next steps:');
      console.log('1. Run the DMCC document processing API endpoint to import these documents to the database');
      console.log('2. Or use the process-dmcc-docs.ts script directly');
      console.log('========================================================');
    } else {
      console.error('========================================================');
      console.error('DMCC document download process failed');
      console.error(`Error: ${result.error}`);
      console.error('========================================================');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('========================================================');
    console.error('Unexpected error during document download:');
    console.error(err);
    console.error('========================================================');
    process.exit(1);
  });