// Script to initialize business activity tables
import pg from 'pg';
const { Pool } = pg;

// Create business activity database tables with raw SQL queries
async function setupActivityTables() {
  console.log('Setting up business activity database tables...');
  
  try {
    // Connect to PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);

    // Create tables using raw SQL
    console.log('Creating business activity tables...');
    
    // Create business_activity_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_activity_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parent_id INTEGER REFERENCES business_activity_categories(id)
      )
    `);
    console.log('- Business activity categories table created/verified');
    
    // Create business_activities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_activities (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES business_activity_categories(id),
        name TEXT NOT NULL,
        code TEXT,
        description TEXT,
        requirements TEXT,
        fee_structure JSONB DEFAULT '{}',
        applicable_in JSONB DEFAULT '[]',
        restrictions TEXT,
        approval_time TEXT,
        approval_requirements TEXT
      )
    `);
    console.log('- Business activities table created/verified');
    
    // End connection
    await pool.end();
    
    console.log('Business activity tables setup completed successfully');
  } catch (error) {
    console.error('Error setting up business activity tables:', error);
  }
}

setupActivityTables();