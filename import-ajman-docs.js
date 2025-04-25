/**
 * Simple script to import the Ajman Free Zone documents we created
 * This simulates part of the document fetcher functionality for testing
 */

import * as fs from 'fs';
import * as path from 'path';

// Import db connection
let db;
let sql;
const importDb = async () => {
  const dbModule = await import('./server/db.js');
  const drizzleModule = await import('drizzle-orm');
  db = dbModule.db;
  sql = drizzleModule.sql;
  return db;
};

async function importAjmanDocuments() {
  try {
    if (!db) await importDb();
    
    const freeZoneId = 9; // Ajman Free Zone
    const baseDir = path.resolve('./freezone_docs/ajman_free_zone');
    
    // Check if directory exists
    if (!fs.existsSync(baseDir)) {
      console.error(`Directory not found: ${baseDir}`);
      return;
    }
    
    // Find all files recursively
    const findAllFiles = (dir, fileList = []) => {
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
    };
    
    const allFiles = findAllFiles(baseDir);
    console.log(`Found ${allFiles.length} files in ${baseDir} (including subdirectories)`);
    
    for (const filePath of allFiles) {
      
      // Get file stats
      const stats = fs.statSync(filePath);
      
      // Read content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Determine category based on filename
      let category = 'general';
      let subcategory = null;
      let documentType = 'Text';
      
      if (file.includes('business') || file.includes('setup')) {
        category = 'business_setup';
        subcategory = 'Guide';
      } else if (file.includes('license')) {
        category = 'business_setup';
        subcategory = 'Licensing';
      } else if (file.includes('visa')) {
        category = 'compliance';
        subcategory = 'Visa';
      }
      
      // Generate title from filename
      const title = file
        .replace(/[_-]/g, ' ')
        .replace('.txt', '')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Prepare document data
      const documentData = {
        title,
        filename: file,
        file_path: filePath,
        document_type: documentType,
        category,
        subcategory,
        content,
        file_size: stats.size,
        free_zone_id: freeZoneId,
        metadata: {
          source_url: 'https://www.afz.ae',
          download_timestamp: new Date().toISOString(),
          imported_by: 'test-script'
        },
        uploaded_at: new Date()
      };
      
      console.log(`Importing document: ${title}`);
      
      // Check if document already exists
      const checkResult = await db.execute(
        sql`SELECT id FROM documents WHERE filename = ${file} AND free_zone_id = ${freeZoneId}`
      );
      
      if (checkResult.rows && checkResult.rows.length > 0) {
        console.log(`Document already exists: ${file}`);
        continue;
      }
      
      // Insert document into database
      const result = await db.execute(
        sql`INSERT INTO documents (
          title, filename, file_path, document_type, category, subcategory, 
          content, file_size, free_zone_id, metadata, uploaded_at
        ) VALUES (
          ${documentData.title},
          ${documentData.filename},
          ${documentData.file_path},
          ${documentData.document_type},
          ${documentData.category},
          ${documentData.subcategory},
          ${documentData.content},
          ${documentData.file_size},
          ${documentData.free_zone_id},
          ${JSON.stringify(documentData.metadata)},
          ${documentData.uploaded_at}
        ) RETURNING id`
      );
      
      if (result.rows && result.rows.length > 0) {
        console.log(`Document imported successfully with ID: ${result.rows[0].id}`);
      } else {
        console.error('Failed to import document');
      }
    }
    
    console.log('Import completed');
  } catch (error) {
    console.error('Error importing documents:', error);
  }
}

// Run the import
importAjmanDocuments();