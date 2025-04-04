/**
 * Process SAIF Zone sample documents and add them to the database
 * This script imports the sample documents created for SAIF Zone
 */

import fs from 'fs';
import path from 'path';
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

// Get the free zone ID for SAIF Zone
const SAIF_ZONE_ID = 15; // This should match the ID in your database

/**
 * Find all files recursively in a directory
 * @param dir Directory to search
 * @param fileList Array to store found files
 * @returns Array of file paths
 */
function findAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
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
async function checkDocumentExists(filename) {
  try {
    const result = await db.execute(sql`
      SELECT id FROM documents WHERE filename = ${filename} LIMIT 1
    `);
    
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking if document exists: ${error.message}`);
    return false;
  }
}

/**
 * Determine the subcategory based on document title, file path and category
 */
function determineSubcategory(title, filePath, category) {
  // Extract from filename
  const filename = path.basename(filePath, path.extname(filePath));
  
  if (filename.includes('overview') || title.toLowerCase().includes('overview')) {
    return 'Overview';
  }
  
  if (filename.includes('formation') || title.toLowerCase().includes('formation')) {
    return 'Company Formation';
  }
  
  if (filename.includes('license') || title.toLowerCase().includes('license')) {
    return 'Licensing';
  }
  
  if (filename.includes('legal') || title.toLowerCase().includes('legal')) {
    return 'Legal Structure';
  }
  
  if (filename.includes('package') || title.toLowerCase().includes('package')) {
    return 'Package Options';
  }
  
  // Default subcategories by main category
  const subcategoryMap = {
    'business_setup': 'General',
    'compliance': 'Regulatory Compliance',
    'financial': 'Financial Services',
    'legal': 'Legal Requirements',
    'trade': 'Trading Regulations',
    'knowledge_bank': 'General Knowledge'
  };
  
  return subcategoryMap[category] || 'General';
}

/**
 * Determine document type based on file extension and content
 */
function determineDocumentType(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.txt':
      return 'Text';
    case '.pdf':
      return 'PDF';
    case '.doc':
    case '.docx':
      return 'Word';
    case '.xls':
    case '.xlsx':
      return 'Excel';
    case '.ppt':
    case '.pptx':
      return 'PowerPoint';
    default:
      return 'Other';
  }
}

/**
 * Process SAIF Zone documents and add them to the database
 */
async function processSAIFZoneDocuments() {
  try {
    console.log('Processing SAIF Zone documents...');
    const baseDir = path.join(process.cwd(), 'saif_zone_docs');
    
    // Get all files from the SAIF Zone docs directory
    const allFiles = findAllFiles(baseDir);
    console.log(`Found ${allFiles.length} files in SAIF Zone docs directory`);
    
    // Process each file
    for (const filePath of allFiles) {
      // Skip hidden files and non-text files
      const filename = path.basename(filePath);
      if (filename.startsWith('.') || path.extname(filePath) === '.json') {
        continue;
      }
      
      // Check if document already exists
      if (await checkDocumentExists(filename)) {
        console.log(`Document ${filename} already exists in database. Skipping.`);
        continue;
      }
      
      // Read file content
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract title from first line if it starts with # (markdown heading)
      let title = filename;
      const firstLine = content.split('\n')[0];
      if (firstLine && firstLine.startsWith('# ')) {
        title = firstLine.substring(2);
      }
      
      // Determine category from directory structure
      const relativePath = path.relative(baseDir, filePath);
      const pathParts = relativePath.split(path.sep);
      const category = pathParts[0];
      
      // Determine subcategory
      const subcategory = determineSubcategory(title, filePath, category);
      
      // Determine document type
      const documentType = determineDocumentType(filePath, content);
      
      // Calculate file size
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      
      // Current timestamp for upload time
      const uploadedAt = new Date();
      
      // Create metadata
      const metadata = {
        subcategory,
        source: 'SAIF Zone Website',
        format: path.extname(filePath).substring(1),
        importDate: uploadedAt.toISOString(),
        language: 'en'
      };
      
      // Insert document into database
      try {
        await db.execute(sql`
          INSERT INTO documents 
          (title, content, category, subcategory, metadata, filename, file_path, 
           document_type, file_size, free_zone_id, uploaded_at)
          VALUES 
          (${title}, ${content}, ${category}, ${subcategory}, 
           ${JSON.stringify(metadata)}, ${filename}, ${relativePath},
           ${documentType}, ${fileSize}, ${SAIF_ZONE_ID}, ${uploadedAt})
        `);
        
        console.log(`Added document: ${title}`);
      } catch (error) {
        console.error(`Error inserting document ${title}: ${error.message}`);
      }
    }
    
    console.log('SAIF Zone document processing completed.');
  } catch (error) {
    console.error('Error processing SAIF Zone documents:', error);
  }
}

// Run the document processing
processSAIFZoneDocuments()
  .then(() => console.log('Done!'))
  .catch(error => console.error('Error:', error));