// Script to initialize the document-related database tables
import pg from 'pg';
const { Pool } = pg;

// Create document-related database tables with raw SQL queries
async function setupDocumentTables() {
  console.log('Setting up document-related database tables...');
  
  try {
    // Connect to PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);

    // Create tables using raw SQL
    console.log('Creating document tables...');
    
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
    console.log('- Documents table created/verified');
    
    // Create user_documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        document_type TEXT NOT NULL,
        document_category TEXT,
        status TEXT DEFAULT 'active',
        expiry_date TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        uploaded_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('- User documents table created/verified');
    
    // Create document_templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        free_zone_id INTEGER REFERENCES free_zones(id),
        category TEXT,
        template_file TEXT,
        required_documents JSONB DEFAULT '[]',
        form_fields JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('- Document templates table created/verified');
    
    // Create template_submissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS template_submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        template_id INTEGER NOT NULL REFERENCES document_templates(id),
        submission_data JSONB DEFAULT '{}',
        attached_documents JSONB DEFAULT '[]',
        status TEXT DEFAULT 'draft',
        submitted_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('- Template submissions table created/verified');
    
    // Create document_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        required_fields JSONB DEFAULT '[]',
        validation_rules JSONB DEFAULT '{}'
      )
    `);
    console.log('- Document types table created/verified');
    
    // End connection
    await pool.end();
    
    console.log('Document tables setup completed successfully');
  } catch (error) {
    console.error('Error setting up document tables:', error);
  }
}

setupDocumentTables();