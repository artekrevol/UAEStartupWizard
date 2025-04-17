// Script to initialize assistant and communication tables
import pg from 'pg';
const { Pool } = pg;

// Create assistant-related database tables with raw SQL queries
async function setupAssistantTables() {
  console.log('Setting up assistant and communication database tables...');
  
  try {
    // Connect to PostgreSQL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0].now);

    // Create tables using raw SQL
    console.log('Creating assistant and communication tables...');
    
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
    console.log('- Conversations table created/verified');
    
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
    console.log('- Messages table created/verified');
    
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
    console.log('- Assistant memory table created/verified');
    
    // Create issues_log table
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
    console.log('- Issues log table created/verified');
    
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
    console.log('- Web research items table created/verified');
    
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
    console.log('- AI training data table created/verified');
    
    // End connection
    await pool.end();
    
    console.log('Assistant and communication tables setup completed successfully');
  } catch (error) {
    console.error('Error setting up assistant tables:', error);
  }
}

setupAssistantTables();