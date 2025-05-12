/**
 * Script to run the SAIF Zone document downloader
 * 
 * This script downloads documents from the Sharjah Airport International Free Zone website
 * and saves them to structured directories for use in the application.
 * 
 * Usage: node scraper/run_saif_zone_document_downloader.js
 */

const { downloadSAIFZoneDocuments } = require('./saif_zone_document_downloader');

async function main() {
  console.log('Starting SAIF Zone document download...');
  
  try {
    const result = await downloadSAIFZoneDocuments();
    
    if (result.success) {
      console.log('✅ SAIF Zone document download completed successfully');
      console.log(`Total documents downloaded: ${result.downloadedDocs.length}`);
      console.log('Documents saved to saif_zone_docs/documents/ directory');
      console.log('Download report saved to saif_zone_docs/download_report.json');
    } else {
      console.error('❌ Failed to download SAIF Zone documents:', result.error);
    }
  } catch (error) {
    console.error('❌ Error running SAIF Zone document downloader:', error.message);
  }
}

// Run the script
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});