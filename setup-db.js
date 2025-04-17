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
    
    // Create users table (if it doesn't exist, otherwise we'll use the existing one)
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
    
    // Create issues_log table (match existing table structure)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        message TEXT,
        metadata JSONB DEFAULT '{}',
        resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        url TEXT,
        user_agent TEXT,
        component TEXT,
        action TEXT,
        stack_trace TEXT
      )
    `);
    
    // Create conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        source TEXT NOT NULL,
        title TEXT,
        summary TEXT,
        last_message_time TIMESTAMP DEFAULT NOW(),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES conversations(id),
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create assistant_memory table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assistant_memory (
        id SERIAL PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        thread_id TEXT,
        assistant_id TEXT,
        memory_type TEXT NOT NULL,
        content JSONB NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create web_research_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS web_research_items (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        content TEXT,
        search_engine TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
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
    
    // Create ai_training_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_training_data (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT,
        source TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create a test user if none exists
    console.log('Creating test user...');
    await pool.query(`
      INSERT INTO users (username, password, role, company_name)
      VALUES ('admin', 'password123', 'admin', 'Test Company')
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