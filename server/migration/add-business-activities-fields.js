// server/migration/add-business-activities-fields.js
import { pool } from '../db.js';

async function runMigration() {
  console.log('Starting migration script...');
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('Starting migration to add new fields to business_activities table');
    
    // Check if columns already exist
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'business_activities'
      AND column_name IN ('activity_code', 'name_arabic', 'description_arabic', 'industry_group', 'isic_activity')
    `;
    const existingColumns = await client.query(checkColumnQuery);
    const existingColumnNames = existingColumns.rows.map(row => row.column_name);
    
    // Add columns if they don't exist
    if (!existingColumnNames.includes('activity_code')) {
      console.log('Adding activity_code column');
      await client.query(`ALTER TABLE business_activities ADD COLUMN activity_code TEXT`);
    }
    
    if (!existingColumnNames.includes('name_arabic')) {
      console.log('Adding name_arabic column');
      await client.query('ALTER TABLE business_activities ADD COLUMN name_arabic TEXT');
    }
    
    if (!existingColumnNames.includes('description_arabic')) {
      console.log('Adding description_arabic column');
      await client.query('ALTER TABLE business_activities ADD COLUMN description_arabic TEXT');
    }
    
    if (!existingColumnNames.includes('industry_group')) {
      console.log('Adding industry_group column');
      await client.query('ALTER TABLE business_activities ADD COLUMN industry_group TEXT');
    }
    
    if (!existingColumnNames.includes('isic_activity')) {
      console.log('Adding isic_activity column');
      await client.query('ALTER TABLE business_activities ADD COLUMN isic_activity TEXT');
    }
    
    // Make category_id nullable (if it's not already)
    
    // First check if we need to make the column nullable
    const columnNullCheck = await client.query(`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'business_activities'
      AND column_name = 'category_id'
    `);
    
    // If category_id exists and is not nullable, make it nullable
    if (columnNullCheck.rows.length > 0 && columnNullCheck.rows[0].is_nullable === 'NO') {
      console.log('Making category_id column nullable');
      
      // First drop any foreign key constraint
      const constraintCheck = await client.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'business_activities'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%category_id%'
      `);
      
      if (constraintCheck.rows.length > 0) {
        const constraintName = constraintCheck.rows[0].constraint_name;
        console.log(`Dropping foreign key constraint: ${constraintName}`);
        await client.query(`ALTER TABLE business_activities DROP CONSTRAINT ${constraintName}`);
      }
      
      // Now alter the column to be nullable
      await client.query(`ALTER TABLE business_activities ALTER COLUMN category_id DROP NOT NULL`);
      
      // Re-add the constraint but allow NULL values (which happens by default)
      await client.query(`
        ALTER TABLE business_activities 
        ADD CONSTRAINT fk_business_activities_category 
        FOREIGN KEY (category_id) 
        REFERENCES business_categories(id)
      `);
    } else {
      console.log('Category_id column is already nullable or does not exist');
    }
    
    console.log('Migration completed successfully');
    
    // Commit the transaction
    await client.query('COMMIT');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the migration if this script is executed directly
if (process.argv[1].includes('add-business-activities-fields.js')) {
  runMigration()
    .then(() => {
      console.log('Migration script finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { runMigration };