/**
 * Process SAIF Zone documents and add them to the database
 * This script processes documents from the SAIF Zone downloads for use in the application
 */

import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { documents } from './shared/schema';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from './server/storage';
import { InsertDocument } from '@shared/schema';

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
      fileList.push(filePath);
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
 * Determine the subcategory based on document title, file path and category
 */
function determineSubcategory(title: string, filePath: string, category: string): string {
  const lowerTitle = title.toLowerCase();
  const lowerPath = filePath.toLowerCase();
  
  // Business setup related subcategories
  if (category === 'business_setup') {
    if (lowerTitle.includes('license') || lowerPath.includes('license')) {
      return 'licensing';
    }
    if (lowerTitle.includes('registration') || lowerPath.includes('registration')) {
      return 'company_formation';
    }
    if (lowerTitle.includes('visa') || lowerPath.includes('visa')) {
      return 'visa';
    }
    return 'general_setup';
  }
  
  // Financial related subcategories
  if (category === 'financial') {
    if (lowerTitle.includes('tax') || lowerPath.includes('tax')) {
      return 'tax_compliance';
    }
    if (lowerTitle.includes('accounting') || lowerPath.includes('accounting')) {
      return 'accounting';
    }
    if (lowerTitle.includes('banking') || lowerPath.includes('banking')) {
      return 'banking';
    }
    return 'financial_general';
  }

  // Compliance related subcategories
  if (category === 'compliance') {
    if (lowerTitle.includes('kyc') || lowerPath.includes('kyc')) {
      return 'kyc';
    }
    if (lowerTitle.includes('report') || lowerPath.includes('report')) {
      return 'reporting';
    }
    return 'compliance_general';
  }

  // Legal related subcategories
  if (category === 'legal') {
    if (lowerTitle.includes('contract') || lowerPath.includes('contract')) {
      return 'contracts';
    }
    if (lowerTitle.includes('dispute') || lowerPath.includes('dispute')) {
      return 'dispute_resolution';
    }
    return 'legal_general';
  }
  
  // Trade related subcategories
  if (category === 'trade') {
    if (lowerTitle.includes('import') || lowerTitle.includes('export') || 
        lowerPath.includes('import') || lowerPath.includes('export')) {
      return 'import_export';
    }
    if (lowerTitle.includes('certificate') || lowerPath.includes('certificate')) {
      return 'certificates';
    }
    return 'trade_general';
  }
  
  // Forms related subcategories
  if (category === 'forms') {
    if (lowerTitle.includes('registration') || lowerPath.includes('registration')) {
      return 'registration_forms';
    }
    if (lowerTitle.includes('visa') || lowerPath.includes('visa')) {
      return 'visa_forms';
    }
    if (lowerTitle.includes('license') || lowerPath.includes('license')) {
      return 'license_forms';
    }
    return 'general_forms';
  }
  
  // Default subcategory
  return '';
}

/**
 * Process SAIF Zone documents and add them to the database
 */
async function processSAIFZoneDocuments() {
  try {
    console.log('Processing SAIF Zone documents...');
    
    // Path to SAIF Zone documents directory
    const saifZoneDocsDir = path.join(process.cwd(), 'saif_zone_docs');
    
    // Check if directory exists
    if (!fs.existsSync(saifZoneDocsDir)) {
      console.log('SAIF Zone docs directory does not exist');
      return {
        processedCount: 0,
        addedCount: 0,
        errorCount: 0,
        messages: ['SAIF Zone docs directory does not exist'],
        success: false
      };
    }
    
    // Find all files in the directory recursively
    const allFiles = findAllFiles(saifZoneDocsDir);
    
    // Filter for supported file types
    const supportedExtensions = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.txt'];
    const documentFiles = allFiles.filter(file => 
      supportedExtensions.includes(path.extname(file).toLowerCase())
    );
    
    console.log(`Found ${documentFiles.length} document files in SAIF Zone docs directory and subdirectories`);
    
    let processedCount = 0;
    let addedCount = 0;
    let errorCount = 0;
    let resultMessages: string[] = [];
    
    // Process each file
    for (const filePath of documentFiles) {
      try {
        // Get file stats
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;
        
        // Get relative path for category
        const relativePath = path.relative(saifZoneDocsDir, filePath);
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
        
        // Determine subcategory based on title and path
        const subcategory = determineSubcategory(title, filePath, category);
        
        // Create document in database
        const documentData: InsertDocument = {
          title,
          filename,
          filePath,
          fileSize,
          documentType,
          category,
          freeZoneId: 15, // SAIF Zone Free Zone ID - update this with the correct ID
          metadata: {
            source: 'SAIF Zone Website',
            uploadMethod: 'automatic',
            processingDate: new Date().toISOString(),
            relativePath,
            subcategory,
            uploadedBy: 'system'
          },
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
          console.log(`Document already exists: ${title}`);
          resultMessages.push(`Skipped (exists): ${title}`);
        }
        
        processedCount++;
      } catch (error) {
        console.error(`Error processing document ${filePath}:`, error);
        resultMessages.push(`Error processing: ${path.basename(filePath)}`);
        errorCount++;
      }
    }
    
    // Get document count in database
    const documentsCount = await db
      .select({ count: sql`count(*)` })
      .from(documents);
    
    const totalDocCount = Number(documentsCount[0]?.count || 0);
    
    console.log(`Finished processing SAIF Zone documents`);
    console.log(`Summary: Processed ${processedCount} files, Added ${addedCount} documents, Errors: ${errorCount}`);
    console.log(`Total documents in database: ${totalDocCount}`);
    
    return {
      processedCount,
      addedCount,
      errorCount,
      totalDocuments: totalDocCount,
      messages: resultMessages,
      success: errorCount === 0
    };
  } catch (error) {
    console.error('Error processing SAIF Zone documents:', error);
    return {
      processedCount: 0,
      addedCount: 0,
      errorCount: 1,
      totalDocuments: 0,
      messages: [`Global error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      success: false
    };
  }
}

// Run the processing
processSAIFZoneDocuments()
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });