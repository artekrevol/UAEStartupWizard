// server/migration/import-business-activities.js
import { pool } from '../db';
import fs from 'fs';
import { parse } from 'csv-parse';
import path from 'path';

async function importBusinessActivities(csvFilePath) {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log(`Starting import of business activities from ${csvFilePath}`);
    
    // Read the CSV file
    let csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    // Remove BOM if present
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }
    
    // Fix potential issues with quotes
    csvContent = csvContent.replace(/""([^"]*)""/g, '"$1"');
    
    console.log('Parsing CSV file...');
    
    // Parse the CSV with proper options
    const records = await new Promise((resolve, reject) => {
      parse(csvContent, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
        skip_lines_with_empty_values: false, // Don't skip lines that might have empty values but have needed data
        relax_quotes: true, // Be more lenient with quotes
        relax_column_count: true, // Allow variable column count
        quote: '"',
        escape: '"',
        comment: '#', // Ignore lines that start with #
        from_line: 1 // Start from the first line
      }, (err, records) => {
        if (err) reject(err);
        else resolve(records);
      });
    });
    
    // Process the data to extract only the valid rows
    const validRecords = [];
    let headerFound = false;
    
    console.log('Found total records:', records.length);
    
    for (const record of records) {
      // Skip empty rows or rows with too few columns
      if (!record || record.length < 2 || !record[1]) continue;
      
      // Check if this is the header row - we need to be more flexible here
      if (!headerFound) {
        const rowStr = JSON.stringify(record);
        if (rowStr.includes('Activity Code') && rowStr.includes('Activity Name')) {
          console.log('Found header row:', rowStr);
          headerFound = true;
          continue;
        }
      }
      
      // Accept a broader range of activity codes
      // Activity codes can be like "5911008", "7310-024", "659992", etc.
      if (record[1] && record[1].trim()) {
        // Try to extract activity code regardless of format
        const activityCode = record[1].trim();
        
        // Only proceed if we have a name
        if (record[2] && record[2].trim()) {
          validRecords.push({
            activityCode: activityCode,
            name: record[2] ? record[2].trim() : null,
            nameArabic: record[3] ? record[3].trim() : null,
            description: record[4] ? record[4].trim() : null,
            descriptionArabic: record[5] ? record[5].trim() : null,
            industryGroup: record[6] ? record[6].trim() : null,
            isicActivity: record[7] === 'TRUE' ? 'true' : (record[7] ? record[7].trim() : null)
          });
        }
      }
    }
    
    console.log(`Found ${validRecords.length} valid business activities to import`);
    
    // Check if we need to include category_id in our query
    const checkCategoryIdColumn = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns
      WHERE table_name = 'business_activities' 
      AND column_name = 'category_id'
    `);
    
    let insertQuery;
    let needsCategoryId = false;
    
    if (checkCategoryIdColumn.rows.length > 0) {
      if (checkCategoryIdColumn.rows[0].is_nullable === 'NO') {
        console.log('category_id is NOT NULL, we need to provide a value');
        needsCategoryId = true;
        
        // Check if we have at least one category we can use as default
        const categoryCheck = await client.query('SELECT id FROM business_categories LIMIT 1');
        
        let defaultCategoryId = null;
        if (categoryCheck.rows.length > 0) {
          defaultCategoryId = categoryCheck.rows[0].id;
          console.log(`Using default category_id ${defaultCategoryId}`);
        } else {
          // Create a default category if none exists
          console.log('No existing categories found, creating a default one');
          const newCategory = await client.query(`
            INSERT INTO business_categories (name, description) 
            VALUES ('Imported Activities', 'Default category for imported activities')
            RETURNING id
          `);
          defaultCategoryId = newCategory.rows[0].id;
          console.log(`Created default category with id ${defaultCategoryId}`);
        }
        
        insertQuery = `
          INSERT INTO business_activities
            (activity_code, name, name_arabic, description, description_arabic, industry_group, isic_activity, category_id)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, ${defaultCategoryId})
          ON CONFLICT (activity_code) 
          DO UPDATE SET
            name = EXCLUDED.name,
            name_arabic = EXCLUDED.name_arabic,
            description = EXCLUDED.description,
            description_arabic = EXCLUDED.description_arabic,
            industry_group = EXCLUDED.industry_group,
            isic_activity = EXCLUDED.isic_activity
          RETURNING id
        `;
      } else {
        console.log('category_id is nullable, we can omit it');
        needsCategoryId = false;
      }
    }
    
    if (!needsCategoryId) {
      insertQuery = `
        INSERT INTO business_activities
          (activity_code, name, name_arabic, description, description_arabic, industry_group, isic_activity)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (activity_code) 
        DO UPDATE SET
          name = EXCLUDED.name,
          name_arabic = EXCLUDED.name_arabic,
          description = EXCLUDED.description,
          description_arabic = EXCLUDED.description_arabic,
          industry_group = EXCLUDED.industry_group,
          isic_activity = EXCLUDED.isic_activity
        RETURNING id
      `;
    }
    
    // Check for and fix any potential NULL or 'N/A' values in activity_code
    const checkNullValues = await client.query(`
      SELECT id FROM business_activities 
      WHERE activity_code IS NULL OR activity_code = 'N/A'
    `);
    
    if (checkNullValues.rows.length > 0) {
      console.log(`Found ${checkNullValues.rows.length} rows with NULL or 'N/A' activity_code values. Updating them with unique codes.`);
      
      for (let i = 0; i < checkNullValues.rows.length; i++) {
        const id = checkNullValues.rows[i].id;
        const uniqueCode = `LEGACY-${id}-${Date.now()}-${i}`;
        await client.query(`
          UPDATE business_activities 
          SET activity_code = $1 
          WHERE id = $2
        `, [uniqueCode, id]);
      }
    }
    
    // Check if activity_code has a unique constraint, if not add it
    const constraintCheck = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'business_activities'
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%activity_code%'
    `);
    
    if (constraintCheck.rows.length === 0) {
      console.log('Adding unique constraint on activity_code');
      await client.query('ALTER TABLE business_activities ADD CONSTRAINT business_activities_activity_code_key UNIQUE (activity_code)');
    }
    
    // Import the records in batches to avoid memory issues
    const batchSize = 100;
    let importedCount = 0;
    
    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize);
      
      for (const record of batch) {
        await client.query(insertQuery, [
          record.activityCode,
          record.name,
          record.nameArabic,
          record.description,
          record.descriptionArabic,
          record.industryGroup,
          record.isicActivity
        ]);
        importedCount++;
      }
      
      console.log(`Imported ${Math.min(i + batchSize, validRecords.length)} of ${validRecords.length} activities`);
    }
    
    console.log(`Successfully imported ${importedCount} business activities`);
    
    // Commit the transaction
    await client.query('COMMIT');
    return importedCount;
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Import failed:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the import if this script is executed directly
if (process.argv[1].includes('import-business-activities.js')) {
  const csvFilePath = path.join(process.cwd(), 'attached_assets/ISIC_Activity-Lists_2024.csv');
  
  importBusinessActivities(csvFilePath)
    .then((count) => {
      console.log(`Import script finished successfully. Imported ${count} business activities.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import script failed:', error);
      process.exit(1);
    });
}

export { importBusinessActivities };