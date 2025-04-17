// Script to initialize the core database tables
import pg from 'pg';
const { Pool } = pg;

// Create essential database tables with raw SQL queries
async function setupCoreTables() {
  console.log('Setting up core database tables...');
  
  try {
    // Connect to PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);

    // Create tables using raw SQL
    console.log('Creating core tables...');
    
    // Create users table (if it doesn't exist)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        company_name TEXT,
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('- Users table created/verified');
    
    // Create free_zones table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS free_zones (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        location TEXT,
        benefits JSONB DEFAULT '{}',
        requirements JSONB DEFAULT '{}',
        industries JSONB DEFAULT '{}',
        license_types JSONB DEFAULT '{}',
        facilities JSONB DEFAULT '{}',
        website TEXT,
        setup_cost JSONB DEFAULT '{}',
        faqs JSONB DEFAULT '{}',
        last_updated TIMESTAMP
      )
    `);
    console.log('- Free zones table created/verified');
    
    // Create business_setup table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_setup (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        business_type TEXT,
        business_name TEXT,
        business_activity TEXT,
        selected_free_zone INTEGER REFERENCES free_zones(id),
        budget TEXT,
        timeline TEXT,
        requirements JSONB DEFAULT '{}',
        progress JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('- Business setup table created/verified');
    
    // Create a test user
    console.log('Creating test user...');
    await pool.query(`
      INSERT INTO users (username, password, role, company_name)
      VALUES ('admin', 'password123', 'admin', 'Test Company')
      ON CONFLICT DO NOTHING
    `);
    
    // End connection
    await pool.end();
    
    console.log('Core database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupCoreTables();