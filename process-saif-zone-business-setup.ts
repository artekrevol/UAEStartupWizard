/**
 * Process SAIF Zone Business Setup information and add it to the database
 * This script processes the extracted business setup information and adds it to our document database
 */

import * as fs from 'fs';
import * as path from 'path';
import { storage } from './server/storage';
import { InsertDocument } from './shared/schema';

const BUSINESS_SETUP_JSON_PATH = path.join(process.cwd(), 'saif_zone_docs', 'business_setup', 'business_setup_page.json');
const BUSINESS_SETUP_TEXT_PATH = path.join(process.cwd(), 'saif_zone_docs', 'business_setup', 'business_setup_page.txt');

// SAIF Zone ID in the database
const SAIF_ZONE_ID = 15;

/**
 * Check if a document already exists in the database
 */
async function checkDocumentExists(filename: string): Promise<boolean> {
  try {
    const documents = await storage.getDocumentsByFilename(filename);
    return documents.length > 0;
  } catch (error) {
    console.error('Error checking if document exists:', error);
    return false;
  }
}

/**
 * Process the business setup information and add it to the database
 */
async function processBusinessSetupInfo(): Promise<boolean> {
  try {
    // Check if files exist
    if (!fs.existsSync(BUSINESS_SETUP_JSON_PATH) || !fs.existsSync(BUSINESS_SETUP_TEXT_PATH)) {
      console.error('Business setup files not found. Run saif_zone_business_setup_scraper.js first.');
      return false;
    }
    
    // Read JSON data for metadata
    const jsonData = JSON.parse(fs.readFileSync(BUSINESS_SETUP_JSON_PATH, 'utf8'));
    
    // Read text content
    const textContent = fs.readFileSync(BUSINESS_SETUP_TEXT_PATH, 'utf8');
    
    // Create title for the document
    const title = 'SAIF Zone Business Setup Guide';
    const filename = 'business_setup_page.txt';
    
    // Check if document already exists
    const exists = await checkDocumentExists(filename);
    if (exists) {
      console.log(`Document "${title}" already exists. Skipping.`);
      return true;
    }
    
    // Prepare document data
    const documentData: InsertDocument = {
      title,
      filename,
      filePath: BUSINESS_SETUP_TEXT_PATH,
      fileSize: Buffer.from(textContent).length,
      documentType: 'guide',
      category: 'business_setup',
      subcategory: 'Setup Process',
      freeZoneId: SAIF_ZONE_ID,
      content: textContent,
      metadata: JSON.stringify({
        format: 'txt',
        source: 'SAIF Zone Website',
        language: 'en',
        importDate: new Date().toISOString(),
        subcategory: 'Setup Process',
        url: 'https://www.saif-zone.com/en/business-set-up/',
        extracted: jsonData.extracted || new Date().toISOString()
      }),
      uploadedAt: new Date()
    };
    
    // Insert into database using storage interface
    await storage.createDocument(documentData);
    
    console.log(`Successfully added document "${title}" to the database.`);
    return true;
    
  } catch (error) {
    console.error(`Error processing business setup information: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Run the processing
processBusinessSetupInfo()
  .then(result => {
    if (result) {
      console.log('Business setup information processed and added to the database successfully.');
    } else {
      console.error('Failed to process business setup information.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running processing script:', error);
    process.exit(1);
  });