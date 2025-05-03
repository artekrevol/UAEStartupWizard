/**
 * Setup Analysis Records Table
 * 
 * This script creates the analysis_records table for the AI Product Manager
 * which is required for the audit and enrichment workflow
 */

import pg from 'pg';
const { Pool } = pg;

async function setupAnalysisRecordsTable() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('Creating analysis_records table...');
    
    // Create the analysis_records table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS analysis_records (
        id SERIAL PRIMARY KEY,
        free_zone_id INTEGER NOT NULL,
        field TEXT NOT NULL,
        status TEXT NOT NULL,
        confidence FLOAT DEFAULT 0.5,
        last_analyzed TIMESTAMP DEFAULT NOW(),
        recommendations JSONB DEFAULT '[]',
        content TEXT,
        source TEXT,
        UNIQUE(free_zone_id, field)
      );
    `;
    
    await pool.query(createTableQuery);
    
    console.log('Analysis records table created successfully');
    
    await pool.end();
    
    console.log('Setup completed');
  } catch (error) {
    console.error('Error setting up analysis records table:', error);
  }
}

setupAnalysisRecordsTable();