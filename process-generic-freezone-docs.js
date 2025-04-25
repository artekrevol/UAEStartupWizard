/**
 * Process and import documents downloaded by the generic free zone document downloader
 * 
 * This script:
 * 1. Reads document summary files created by the downloader
 * 2. Processes each document using appropriate methods based on file type
 * 3. Imports documents with metadata into the database
 * 4. Generates a comprehensive import report
 */

const fs = require('fs');
const path = require('path');
const { db } = require('./server/db');
const { documents } = require('./shared/schema');
const { eq, sql } = require('drizzle-orm');

// Mapping of categories to subcategories
const SUBCATEGORY_MAPPING = {
  'business_setup': [
    'company_formation', 'registration', 'incorporation', 'startup',
    'licensing', 'costs', 'timeline'
  ],
  'legal': [
    'regulations', 'compliance', 'laws', 'legal_structure', 'contracts'
  ],
  'financial': [
    'banking', 'tax', 'accounting', 'payment', 'fees', 'costs'
  ],
  'visa': [
    'residence', 'employment', 'family', 'investor', 'dependent'
  ],
  'license': [
    'commercial', 'industrial', 'professional', 'e_commerce', 'trading'
  ],
  'trade': [
    'import', 'export', 'customs', 'logistics', 'warehousing'
  ],
  'forms': [
    'application', 'registration', 'request', 'template', 'declaration'
  ],
  'compliance': [
    'kyc', 'aml', 'due_diligence', 'policy', 'procedures'
  ],
  'knowledge_bank': [
    'guide', 'manual', 'handbook', 'faq', 'resources'
  ]
};

/**
 * Check if a document already exists in the database
 */
async function checkDocumentExists(filename, freeZoneId) {
  try {
    const result = await db
      .select()
      .from(documents)
      .where(sql`filename = ${filename} AND free_zone_id = ${freeZoneId}`)
      .limit(1);
    
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking if document exists: ${error.message}`);
    return false;
  }
}

/**
 * Determine the subcategory based on document title, content, and category
 */
function determineSubcategory(title, filePath, category) {
  // Combine title and file path for analysis
  const textToAnalyze = `${title} ${filePath}`.toLowerCase();
  
  // Get potential subcategories for this category
  const subcategories = SUBCATEGORY_MAPPING[category] || [];
  
  // Look for subcategory keywords in the text
  for (const subcategory of subcategories) {
    // Convert subcategory from snake_case to space-separated words for matching
    const subcategoryWords = subcategory.replace(/_/g, ' ').split(' ');
    
    // Check if any of the words appear in the text
    if (subcategoryWords.some(word => textToAnalyze.includes(word))) {
      return subcategory;
    }
  }
  
  // Default to "general" subcategory if no match found
  return 'general';
}

/**
 * Determine document type based on file extension
 */
function determineDocumentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  
  switch (extension) {
    case '.pdf':
      return 'pdf';
    case '.doc':
    case '.docx':
      return 'word';
    case '.xls':
    case '.xlsx':
      return 'excel';
    case '.ppt':
    case '.pptx':
      return 'powerpoint';
    case '.txt':
      return 'text';
    case '.zip':
      return 'archive';
    default:
      return 'other';
  }
}

/**
 * Read document content or return placeholder for binary files
 */
function readDocumentContent(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  
  // Only read text-based files
  if (extension === '.txt') {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error(`Error reading file content: ${error.message}`);
      return 'File content could not be read.';
    }
  }
  
  // For binary files, return placeholder
  return `This is a ${extension.replace('.', '')} file. Access the original file for content.`;
}

/**
 * Process and import documents for a specific free zone
 */
async function processFreeZoneDocuments(freeZoneId, baseDir = null) {
  try {
    console.log(`Processing documents for free zone ID: ${freeZoneId}`);
    
    // Get free zone details
    const freeZoneResult = await db.execute(
      sql`SELECT id, name FROM free_zones WHERE id = ${freeZoneId}`
    );
    
    if (!freeZoneResult.rows || freeZoneResult.rows.length === 0) {
      console.error(`Free zone with ID ${freeZoneId} not found`);
      return { success: false, message: 'Free zone not found' };
    }
    
    const freeZone = freeZoneResult.rows[0];
    console.log(`Processing documents for ${freeZone.name}`);
    
    // Determine the documents directory
    const freeZoneDirName = freeZone.name.toLowerCase().replace(/\s+/g, '_');
    const documentsDir = baseDir || path.resolve(`./freezone_docs/${freeZoneDirName}`);
    
    // Check if documents directory exists
    if (!fs.existsSync(documentsDir)) {
      console.error(`Documents directory not found: ${documentsDir}`);
      return { success: false, message: 'Documents directory not found' };
    }
    
    // Look for download summary file
    const summaryPath = path.join(documentsDir, 'download_summary.json');
    if (!fs.existsSync(summaryPath)) {
      console.error(`Summary file not found: ${summaryPath}`);
      return { success: false, message: 'Summary file not found' };
    }
    
    // Read summary file
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    console.log(`Found ${summary.documents.length} documents in summary`);
    
    // Process each document
    const results = {
      total: summary.documents.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      documentsByCategory: {}
    };
    
    for (const doc of summary.documents) {
      try {
        // Check if document exists
        const fileName = path.basename(doc.filePath);
        const exists = await checkDocumentExists(fileName, freeZoneId);
        
        if (exists) {
          console.log(`Document already exists: ${fileName}`);
          results.skipped++;
          continue;
        }
        
        // Determine document properties
        const documentType = determineDocumentType(doc.filePath);
        const category = doc.category;
        const subcategory = determineSubcategory(doc.title, doc.filePath, category);
        
        // Read content if possible
        const content = readDocumentContent(doc.filePath);
        
        // Prepare document data
        const documentData = {
          title: doc.title,
          filename: fileName,
          filePath: doc.filePath.replace(/^\.\//, '/'),
          category: category,
          subcategory: subcategory,
          freeZoneId: freeZoneId,
          documentType: documentType,
          content: content,
          fileSize: doc.size || 0,
          metadata: JSON.stringify({
            source: 'generic_downloader',
            originalUrl: doc.url,
            downloadDate: doc.downloadDate,
            fileType: doc.fileType
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Insert document into database
        await db.execute(sql`
          INSERT INTO documents (
            title, filename, file_path, category, subcategory, 
            free_zone_id, document_type, content, file_size, metadata,
            created_at, updated_at
          ) VALUES (
            ${documentData.title}, ${documentData.filename}, ${documentData.filePath}, 
            ${documentData.category}, ${documentData.subcategory}, ${documentData.freeZoneId},
            ${documentData.documentType}, ${documentData.content}, ${documentData.fileSize}, 
            ${documentData.metadata}, ${documentData.createdAt}, ${documentData.updatedAt}
          )
        `);
        
        console.log(`Imported document: ${documentData.title}`);
        results.imported++;
        
        // Track category stats
        results.documentsByCategory[category] = (results.documentsByCategory[category] || 0) + 1;
        
      } catch (error) {
        console.error(`Error processing document ${doc.title}: ${error.message}`);
        results.errors++;
      }
    }
    
    console.log(`\nImport Results for ${freeZone.name}:`);
    console.log(`Total: ${results.total}`);
    console.log(`Imported: ${results.imported}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Errors: ${results.errors}`);
    console.log('Documents by category:');
    Object.entries(results.documentsByCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    
    return {
      success: true,
      freeZoneId,
      freeZoneName: freeZone.name,
      results
    };
    
  } catch (error) {
    console.error(`Error processing documents: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Process documents for all free zones
 */
async function processAllFreeZoneDocuments() {
  try {
    const baseDir = path.resolve('./freezone_docs');
    
    // Check if base directory exists
    if (!fs.existsSync(baseDir)) {
      console.error(`Base directory not found: ${baseDir}`);
      return { success: false, message: 'Base directory not found' };
    }
    
    // Get all free zones
    const freeZonesResult = await db.execute(sql`SELECT id, name FROM free_zones`);
    
    if (!freeZonesResult.rows || freeZonesResult.rows.length === 0) {
      console.error('No free zones found');
      return { success: false, message: 'No free zones found' };
    }
    
    const results = [];
    
    // Process each free zone
    for (const freeZone of freeZonesResult.rows) {
      console.log(`\n========== Processing ${freeZone.name} ==========\n`);
      
      const freeZoneDirName = freeZone.name.toLowerCase().replace(/\s+/g, '_');
      const freeZoneDir = path.join(baseDir, freeZoneDirName);
      
      // Skip if directory doesn't exist
      if (!fs.existsSync(freeZoneDir)) {
        console.log(`No document directory for ${freeZone.name}, skipping`);
        continue;
      }
      
      const result = await processFreeZoneDocuments(freeZone.id, freeZoneDir);
      results.push({
        freeZoneId: freeZone.id,
        freeZoneName: freeZone.name,
        success: result.success,
        imported: result.results?.imported || 0,
        skipped: result.results?.skipped || 0,
        errors: result.results?.errors || 0
      });
    }
    
    // Generate summary
    const summary = {
      totalFreeZones: results.length,
      successfulImports: results.filter(r => r.success).length,
      failedImports: results.filter(r => !r.success).length,
      totalDocumentsImported: results.reduce((sum, r) => sum + (r.imported || 0), 0),
      results
    };
    
    // Save summary to file
    fs.writeFileSync(
      path.resolve('./freezone_docs/all_imports_summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`\n===== Document Import Summary =====`);
    console.log(`Total Free Zones: ${summary.totalFreeZones}`);
    console.log(`Successful Imports: ${summary.successfulImports}`);
    console.log(`Failed Imports: ${summary.failedImports}`);
    console.log(`Total Documents Imported: ${summary.totalDocumentsImported}`);
    
    return summary;
    
  } catch (error) {
    console.error(`Error processing all free zone documents: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// If running as main script
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && !isNaN(parseInt(args[0]))) {
    // Process specific free zone
    const freeZoneId = parseInt(args[0]);
    processFreeZoneDocuments(freeZoneId)
      .then(result => {
        console.log('Process complete');
        process.exit(0);
      })
      .catch(error => {
        console.error('Process failed:', error);
        process.exit(1);
      });
  } else {
    // Process all free zones
    processAllFreeZoneDocuments()
      .then(result => {
        console.log('Process complete');
        process.exit(0);
      })
      .catch(error => {
        console.error('Process failed:', error);
        process.exit(1);
      });
  }
}

module.exports = {
  processFreeZoneDocuments,
  processAllFreeZoneDocuments
};