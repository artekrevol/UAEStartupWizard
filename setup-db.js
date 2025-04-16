// Script to initialize the database
import pg from 'pg';
const { Pool } = pg;

// Create database tables with raw SQL queries
async function setupDatabase() {
  console.log('Setting up database...');
  
  try {
    // Connect to PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);

    // Create tables using raw SQL
    console.log('Creating tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
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
    
    // Create business_activity_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_activity_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parent_id INTEGER REFERENCES business_activity_categories(id)
      )
    `);
    
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
    
    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        document_type TEXT,
        category TEXT,
        subcategory TEXT,
        free_zone_id INTEGER REFERENCES free_zones(id),
        user_id INTEGER REFERENCES users(id),
        metadata JSONB DEFAULT '{}',
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create issues_log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        message TEXT,
        details JSONB DEFAULT '{}',
        resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create a test user
    console.log('Creating test user...');
    await pool.query(`
      INSERT INTO users (username, password, email, role)
      VALUES ('admin', 'password123', 'admin@example.com', 'admin')
      ON CONFLICT DO NOTHING
    `);
    
    // End connection
    await pool.end();
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupDatabase();