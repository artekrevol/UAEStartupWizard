/**
 * Process and import documents downloaded by the generic free zone document downloader
 * 
 * This script:
 * 1. Reads document summary files created by the downloader
 * 2. Processes each document using appropriate methods based on file type
 * 3. Imports documents with metadata into the database
 * 4. Generates a comprehensive import report
 */

import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as crypto from 'crypto';

// Import db connection
let db;
const importDb = async () => {
  const dbModule = await import('./server/db.js');
  db = dbModule.db;
  return db;
};

/**
 * Check if a document already exists in the database
 */
async function checkDocumentExists(filename, freeZoneId) {
  try {
    if (!db) await importDb();
    
    const query = `
      SELECT id FROM documents 
      WHERE filename = $1 AND free_zone_id = $2
    `;
    
    const result = await db.execute(query, [filename, freeZoneId]);
    return result.rows && result.rows.length > 0;
  } catch (error) {
    console.error(`Error checking if document exists: ${error.message}`);
    return false;
  }
}

/**
 * Determine the subcategory based on document title, content, and category
 */
function determineSubcategory(title, filePath, category) {
  const titleLower = title.toLowerCase();
  
  // Map of common subcategories by main category
  const subcategoryMappings = {
    'business_setup': {
      'licens': 'Licensing',
      'regist': 'Registration',
      'incorporation': 'Incorporation',
      'form': 'Company Formation',
      'startup': 'Startup',
      'establish': 'Establishment',
      'setup process': 'Setup Process',
      'procedure': 'Procedures',
      'overview': 'Overview',
      'guide': 'Guide',
      'package': 'Package Options',
      'structure': 'Legal Structure'
    },
    'compliance': {
      'regulation': 'Regulations',
      'law': 'Legal',
      'kyc': 'KYC',
      'aml': 'AML',
      'rule': 'Rules',
      'policy': 'Policies',
      'guideline': 'Guidelines',
      'visa': 'Visa Information'
    },
    'financial': {
      'fee': 'Fees',
      'payment': 'Payments',
      'banking': 'Banking',
      'tax': 'Taxation',
      'accounting': 'Accounting',
      'invoice': 'Invoicing',
      'service': 'Financial Services'
    },
    'forms': {
      'application': 'Applications',
      'license': 'License Applications',
      'visa': 'Visa Applications',
      'general': 'General'
    },
    'knowledge_bank': {
      'faq': 'FAQs',
      'guide': 'Guides',
      'handbook': 'Handbooks',
      'research': 'Research',
      'article': 'Articles',
      'publication': 'Publications'
    }
  };
  
  // Check for subcategory keywords in the title
  const categoryMap = subcategoryMappings[category];
  
  if (categoryMap) {
    for (const [keyword, subcategory] of Object.entries(categoryMap)) {
      if (titleLower.includes(keyword)) {
        return subcategory;
      }
    }
  }
  
  // Default to null if no subcategory matched
  return null;
}

/**
 * Determine document type based on file extension
 */
function determineDocumentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  const typeMap = {
    '.pdf': 'PDF',
    '.doc': 'Word',
    '.docx': 'Word',
    '.xls': 'Excel',
    '.xlsx': 'Excel',
    '.ppt': 'PowerPoint',
    '.pptx': 'PowerPoint',
    '.txt': 'Text',
    '.rtf': 'Text',
    '.zip': 'Archive',
    '.rar': 'Archive',
    '.jpg': 'Image',
    '.jpeg': 'Image',
    '.png': 'Image',
    '.gif': 'Image'
  };
  
  return typeMap[ext] || 'Other';
}

/**
 * Read document content or return placeholder for binary files
 */
function readDocumentContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const textExtensions = ['.txt', '.html', '.htm', '.md', '.csv'];
  
  if (textExtensions.includes(ext)) {
    // Read text file content
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error(`Error reading text file ${filePath}: ${error.message}`);
      return `[Content extraction failed: ${error.message}]`;
    }
  } else {
    // Return placeholder for binary files
    return `[Binary content: ${ext.substring(1)} file]`;
  }
}

/**
 * Process and import documents for a specific free zone
 */
export async function processFreeZoneDocuments(freeZoneId, baseDir = null) {
  try {
    if (!db) await importDb();
    
    console.log(`Processing documents for free zone ID ${freeZoneId}`);
    
    // If baseDir not provided, construct it from free zone name
    if (!baseDir) {
      // Get free zone details
      const freeZoneResult = await db.execute(`
        SELECT id, name FROM free_zones WHERE id = ${freeZoneId}
      `);
      
      if (!freeZoneResult.rows || freeZoneResult.rows.length === 0) {
        console.error(`Free zone with ID ${freeZoneId} not found`);
        return {
          success: false,
          freeZoneId,
          error: 'Free zone not found'
        };
      }
      
      const freeZone = freeZoneResult.rows[0];
      const freeZoneDirName = freeZone.name.toLowerCase().replace(/\s+/g, '_');
      baseDir = path.resolve('./freezone_docs', freeZoneDirName);
    }
    
    // Check if directory exists
    if (!fs.existsSync(baseDir)) {
      console.error(`Directory not found: ${baseDir}`);
      return {
        success: false,
        freeZoneId,
        error: 'Directory not found'
      };
    }
    
    // Find the summary file
    const summaryPath = path.join(baseDir, 'download_summary.json');
    if (!fs.existsSync(summaryPath)) {
      console.error(`Summary file not found: ${summaryPath}`);
      return {
        success: false,
        freeZoneId,
        error: 'Summary file not found'
      };
    }
    
    // Read the summary file
    console.log(`Reading summary file: ${summaryPath}`);
    const summaryContent = fs.readFileSync(summaryPath, 'utf8');
    const summary = JSON.parse(summaryContent);
    
    // Process each document
    const results = {
      freeZoneId,
      documentsProcessed: 0,
      successCount: 0,
      skippedCount: 0,
      errorCount: 0,
      documents: []
    };
    
    if (!summary.documents || !Array.isArray(summary.downloadResults)) {
      console.error(`Invalid summary file format`);
      return {
        success: false,
        freeZoneId,
        error: 'Invalid summary file format'
      };
    }
    
    // Process each document in the download results
    for (const doc of summary.downloadResults) {
      results.documentsProcessed++;
      
      try {
        if (!doc.downloadSuccess || !doc.filePath) {
          console.log(`Skipping document with failed download: ${doc.url}`);
          results.skippedCount++;
          results.documents.push({
            ...doc,
            success: false,
            action: 'skipped',
            reason: 'Download failed'
          });
          continue;
        }
        
        // Check if file exists
        if (!fs.existsSync(doc.filePath)) {
          console.log(`Skipping missing file: ${doc.filePath}`);
          results.skippedCount++;
          results.documents.push({
            ...doc,
            success: false,
            action: 'skipped',
            reason: 'File missing'
          });
          continue;
        }
        
        // Get file stats
        const stats = fs.statSync(doc.filePath);
        
        // Check if document already exists in database
        const exists = await checkDocumentExists(doc.filename, freeZoneId);
        if (exists) {
          console.log(`Skipping existing document: ${doc.filename}`);
          results.skippedCount++;
          results.documents.push({
            ...doc,
            success: false,
            action: 'skipped',
            reason: 'Document already exists'
          });
          continue;
        }
        
        // Determine document type
        const docType = determineDocumentType(doc.filePath);
        
        // Determine subcategory
        const subcategory = determineSubcategory(doc.title, doc.filePath, doc.category);
        
        // Read content for text files or use placeholder for binary files
        const content = readDocumentContent(doc.filePath);
        
        // Generate hash for document content
        const contentHash = crypto.createHash('md5').update(content).digest('hex');
        
        // Prepare document for database insertion
        const documentData = {
          title: doc.title,
          filename: doc.filename,
          file_path: doc.filePath,
          document_type: docType,
          category: doc.category,
          subcategory,
          content,
          file_size: stats.size,
          free_zone_id: freeZoneId,
          metadata: {
            source_url: doc.url,
            download_timestamp: new Date().toISOString(),
            content_hash: contentHash
          },
          uploaded_at: new Date()
        };
        
        // Insert document into database
        const query = `
          INSERT INTO documents (
            title, filename, file_path, document_type, category, subcategory, 
            content, file_size, free_zone_id, metadata, uploaded_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          ) RETURNING id
        `;
        
        const result = await db.execute(query, [
          documentData.title,
          documentData.filename,
          documentData.file_path,
          documentData.document_type,
          documentData.category,
          documentData.subcategory,
          documentData.content,
          documentData.file_size,
          documentData.free_zone_id,
          JSON.stringify(documentData.metadata),
          documentData.uploaded_at
        ]);
        
        if (result.rows && result.rows.length > 0) {
          console.log(`Document imported: ${doc.filename} (ID: ${result.rows[0].id})`);
          results.successCount++;
          results.documents.push({
            ...doc,
            success: true,
            action: 'imported',
            id: result.rows[0].id
          });
        } else {
          console.error(`Failed to import document: ${doc.filename}`);
          results.errorCount++;
          results.documents.push({
            ...doc,
            success: false,
            action: 'error',
            reason: 'Database insertion failed'
          });
        }
      } catch (error) {
        console.error(`Error processing document: ${error.message}`);
        results.errorCount++;
        results.documents.push({
          ...doc,
          success: false,
          action: 'error',
          reason: error.message
        });
      }
    }
    
    // Write processing results to file
    const resultsPath = path.join(baseDir, 'processing_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    
    console.log(`Document processing completed for free zone ID ${freeZoneId}`);
    console.log(`Documents processed: ${results.documentsProcessed}`);
    console.log(`Documents imported: ${results.successCount}`);
    console.log(`Documents skipped: ${results.skippedCount}`);
    console.log(`Errors: ${results.errorCount}`);
    
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error(`Error processing documents for free zone ID ${freeZoneId}: ${error.message}`);
    return {
      success: false,
      freeZoneId,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Process documents for all free zones
 */
export async function processAllFreeZoneDocuments() {
  try {
    if (!db) await importDb();
    
    console.log('Processing documents for all free zones');
    
    // Get all free zones with websites
    const freeZonesResult = await db.execute(`
      SELECT id, name, website FROM free_zones 
      WHERE website IS NOT NULL AND website != '' 
      ORDER BY name
    `);
    
    if (!freeZonesResult.rows || freeZonesResult.rows.length === 0) {
      console.error('No free zones with websites found');
      return {
        success: false,
        error: 'No free zones with websites found'
      };
    }
    
    const results = {
      totalFreeZones: freeZonesResult.rows.length,
      processedFreeZones: 0,
      totalSuccessCount: 0,
      totalSkippedCount: 0,
      totalErrorCount: 0,
      freeZones: []
    };
    
    for (const freeZone of freeZonesResult.rows) {
      console.log(`Processing documents for ${freeZone.name} (ID: ${freeZone.id})`);
      
      const freeZoneDirName = freeZone.name.toLowerCase().replace(/\s+/g, '_');
      const freeZoneDir = path.resolve('./freezone_docs', freeZoneDirName);
      
      if (!fs.existsSync(freeZoneDir)) {
        console.log(`Skipping ${freeZone.name} - directory not found: ${freeZoneDir}`);
        results.freeZones.push({
          id: freeZone.id,
          name: freeZone.name,
          success: false,
          error: 'Directory not found'
        });
        continue;
      }
      
      const freeZoneResult = await processFreeZoneDocuments(freeZone.id, freeZoneDir);
      results.processedFreeZones++;
      
      if (freeZoneResult.success) {
        results.totalSuccessCount += freeZoneResult.successCount;
        results.totalSkippedCount += freeZoneResult.skippedCount;
        results.totalErrorCount += freeZoneResult.errorCount;
      }
      
      results.freeZones.push({
        id: freeZone.id,
        name: freeZone.name,
        ...freeZoneResult
      });
    }
    
    // Write overall results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = path.resolve('./freezone_docs/results', `all_processing_results_${timestamp}.json`);
    
    // Ensure results directory exists
    const resultsDir = path.dirname(resultsPath);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    
    console.log('Document processing completed for all free zones');
    console.log(`Free zones processed: ${results.processedFreeZones}`);
    console.log(`Total documents imported: ${results.totalSuccessCount}`);
    console.log(`Total documents skipped: ${results.totalSkippedCount}`);
    console.log(`Total errors: ${results.totalErrorCount}`);
    
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error(`Error processing documents for all free zones: ${error.message}`);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}