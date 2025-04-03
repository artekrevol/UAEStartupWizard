/**
 * Process DMCC documents and add them to the database
 * This script directly calls the processing function without needing an API endpoint
 */

import { processDMCCDocuments } from './server/document-upload';
import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { documents } from './shared/schema';

async function processDocuments() {
  try {
    console.log("Starting DMCC document processing...");
    
    // Process DMCC documents
    const processingResult = await processDMCCDocuments();
    
    // Count documents in the database after processing
    const documentsCount = await db
      .select({ count: sql`count(*)` })
      .from(documents);
    
    const count = Number(documentsCount[0]?.count || 0);
    console.log(`Total documents in database after processing: ${count}`);
    
    return {
      message: "DMCC documents processed successfully",
      count: count,
      processingResult
    };
  } catch (error) {
    console.error("Error processing DMCC documents:", error);
    throw error;
  }
}

// Run the processing
processDocuments()
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });