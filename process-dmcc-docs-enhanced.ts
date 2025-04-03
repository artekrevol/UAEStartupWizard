/**
 * Enhanced Process DMCC documents and add them to the database
 * This script processes documents downloaded by the comprehensive DMCC downloader
 * It analyzes document metadata, assigns appropriate categories and subcategories,
 * and imports them into the database with rich metadata.
 */

import * as fs from 'fs';
import * as path from 'path';
import { storage } from './server/storage';
import { InsertDocument } from './shared/schema';
import { db } from './server/db';

// Constants
const DMCC_DOCS_DIR = path.join(process.cwd(), 'dmcc_docs');
const DMCC_FREE_ZONE_ID = 14; // DMCC Free Zone ID

// Map of known categories and their subcategories
const SUBCATEGORY_MAPPING: Record<string, Record<string, string[]>> = {
  business_setup: {
    company_formation: ['setup', 'registration', 'incorporation', 'formation', 'establish'],
    licensing: ['license', 'permit', 'approval', 'requirements'],
  },
  financial: {
    accounting: ['accounting', 'audit', 'financial', 'statement', 'reporting'],
    tax_compliance: ['tax', 'vat', 'fiscal', 'levy', 'duties', 'compliance'],
  },
  compliance: {
    regulatory: ['regulation', 'compliance', 'law', 'legal', 'requirement'],
    kyc: ['kyc', 'know your customer', 'client', 'identity', 'verification'],
    aml: ['aml', 'anti-money', 'laundering', 'fraud', 'financial crime'],
  },
  trade: {
    import_export: ['import', 'export', 'trade', 'customs', 'shipping', 'logistics'],
    commodity: ['commodity', 'goods', 'product', 'material', 'merchandise'],
  },
  legal: {
    contracts: ['contract', 'agreement', 'legal', 'document', 'terms'],
    intellectual_property: ['intellectual', 'property', 'patent', 'trademark', 'copyright'],
    employment: ['employment', 'labor', 'staff', 'workforce', 'personnel', 'hiring'],
  },
};

/**
 * Find all files recursively in a directory
 * @param dir Directory to search
 * @param fileList Array to store found files
 * @returns Array of file paths
 */
function findAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findAllFiles(filePath, fileList);
    } else {
      // Skip metadata files
      if (!file.includes('.metadata.json') && !file.includes('document_index.json') && !file.includes('download_summary.json') && !file.includes('download_results.json')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

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
 * Determine the subcategory based on document title and content
 */
function determineSubcategory(title: string, category: string, filePath: string): string {
  // First check if we already have a subcategory from directory structure
  const pathParts = path.relative(DMCC_DOCS_DIR, filePath).split(path.sep);
  if (pathParts.length > 2) {
    return pathParts[1].toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  
  // Then try to determine subcategory from title
  const titleLower = title.toLowerCase();
  
  // Check if category exists in mapping
  if (!(category in SUBCATEGORY_MAPPING)) {
    return '';
  }
  
  // Check each subcategory's keywords
  for (const [subcategory, keywords] of Object.entries(SUBCATEGORY_MAPPING[category])) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword.toLowerCase())) {
        return subcategory;
      }
    }
  }
  
  // Default subcategory based on category
  switch (category) {
    case 'business_setup':
      return 'company_formation';
    case 'financial':
      return 'accounting';
    case 'compliance':
      return 'regulatory';
    case 'trade':
      return 'import_export';
    case 'legal':
      return 'contracts';
    default:
      return '';
  }
}

/**
 * Process DMCC documents and add them to the database
 */
async function processDocuments() {
  try {
    console.log('Processing DMCC documents...');
    
    // Check if dmcc_docs directory exists
    if (!fs.existsSync(DMCC_DOCS_DIR)) {
      console.log('DMCC docs directory does not exist');
      return {
        processedCount: 0,
        addedCount: 0,
        errorCount: 0,
        messages: ['DMCC docs directory does not exist'],
        success: false
      };
    }
    
    // Recursively find all files in the directory
    const allFiles = findAllFiles(DMCC_DOCS_DIR);
    
    // Filter for supported file types
    const supportedExtensions = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.txt'];
    const documentFiles = allFiles.filter(file => 
      supportedExtensions.includes(path.extname(file).toLowerCase())
    );
    
    console.log(`Found ${documentFiles.length} document files in DMCC docs directory and subdirectories`);
    
    let processedCount = 0;
    let addedCount = 0;
    let errorCount = 0;
    let updatedCount = 0;
    let resultMessages: string[] = [];
    
    // Process each file
    for (const filePath of documentFiles) {
      try {
        // Get file stats
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;
        
        // Get relative path for category
        const relativePath = path.relative(DMCC_DOCS_DIR, filePath);
        const pathParts = relativePath.split(path.sep);
        
        // Use directory structure for categorization
        const category = pathParts.length > 1 ? pathParts[0] : 'general';
        
        // Get filename
        const filename = path.basename(filePath);
        const documentType = path.extname(filename).replace('.', '');
        
        // Create title from filename
        const title = path.basename(filename, path.extname(filename))
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .replace(/[0-9]+\s+/, '') // Remove leading numbers
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Determine subcategory
        const subcategory = determineSubcategory(title, category, filePath);
        
        // Check if metadata file exists
        const metadataFilePath = path.join(
          path.dirname(filePath), 
          `${path.basename(filePath, path.extname(filePath))}.metadata.json`
        );
        
        let metadata: Record<string, any> = {
          source: 'DMCC Knowledge Bank',
          uploadMethod: 'automatic',
          processingDate: new Date().toISOString(),
          relativePath,
          subcategory
        };
        
        // If metadata file exists, read it
        if (fs.existsSync(metadataFilePath)) {
          try {
            const metadataContent = fs.readFileSync(metadataFilePath, 'utf8');
            const parsedMetadata = JSON.parse(metadataContent);
            metadata = {
              ...metadata,
              ...parsedMetadata,
              subcategory // Always use our calculated subcategory
            };
          } catch (metadataError) {
            console.error(`Error reading metadata file ${metadataFilePath}:`, metadataError);
          }
        }
        
        // Create document in database
        const documentData: InsertDocument = {
          title,
          filename,
          filePath,
          fileSize,
          documentType,
          category,
          freeZoneId: DMCC_FREE_ZONE_ID,
          metadata,
          content: null, // We'll add content extraction later if needed
          uploadedAt: new Date()
        };
        
        // Check if document already exists
        const exists = await checkDocumentExists(filename);
        
        if (!exists) {
          try {
            const document = await storage.createDocument(documentData);
            console.log(`Added document to database: ${title}`);
            resultMessages.push(`Added: ${title}`);
            addedCount++;
          } catch (dbError) {
            console.error(`Database error adding document ${title}:`, dbError);
            resultMessages.push(`Error adding ${title}: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
            errorCount++;
          }
        } else {
          // We could update the document with new information
          // Especially to update subcategories
          try {
            // Get existing document
            const existingDocs = await storage.getDocumentsByFilename(filename);
            if (existingDocs.length > 0) {
              const existingDoc = existingDocs[0];
              
              // Update subcategory if it's empty
              if (!existingDoc.metadata?.subcategory && subcategory) {
                await storage.updateDocument(existingDoc.id, {
                  metadata: {
                    ...existingDoc.metadata,
                    subcategory
                  }
                });
                console.log(`Updated subcategory for document: ${title} to ${subcategory}`);
                resultMessages.push(`Updated: ${title} with subcategory ${subcategory}`);
                updatedCount++;
              } else {
                console.log(`Document already exists: ${title}`);
                resultMessages.push(`Skipped (exists): ${title}`);
              }
            }
          } catch (updateError) {
            console.error(`Error updating document ${title}:`, updateError);
            resultMessages.push(`Error updating ${title}: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
            errorCount++;
          }
        }
        
        processedCount++;
      } catch (error) {
        console.error(`Error processing document ${filePath}:`, error);
        resultMessages.push(`Error processing: ${path.basename(filePath)}`);
        errorCount++;
      }
    }
    
    console.log(`Finished processing DMCC documents`);
    console.log(`Summary: Processed ${processedCount} files, Added ${addedCount} documents, Updated ${updatedCount} documents, Errors: ${errorCount}`);
    
    return {
      processedCount,
      addedCount,
      updatedCount,
      errorCount,
      messages: resultMessages,
      success: errorCount === 0
    };
  } catch (error) {
    console.error('Error processing DMCC documents:', error);
    return {
      processedCount: 0,
      addedCount: 0,
      updatedCount: 0,
      errorCount: 1,
      messages: [`Global error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      success: false
    };
  }
}

// Execute the process if called directly
if (require.main === module) {
  processDocuments()
    .then(result => {
      console.log(`Processed ${result.processedCount} files`);
      console.log(`Added ${result.addedCount} new documents`);
      console.log(`Updated ${result.updatedCount} existing documents`);
      console.log(`${result.errorCount} errors occurred`);
      
      if (result.success) {
        console.log('All documents processed successfully');
      } else {
        console.error('Errors occurred during document processing');
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Unhandled error in document processing:', err);
      process.exit(1);
    });
}

export { processDocuments };