/**
 * Setup Enrichment Tasks Table
 * 
 * This script creates the enrichment_tasks table for the AI Product Manager
 * which is required for the task-based enrichment workflow
 */

import pg from 'pg';
const { Pool } = pg;

async function setupEnrichmentTasksTable() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('Creating enrichment_tasks table...');
    
    // Create the enrichment_tasks table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS enrichment_tasks (
        id SERIAL PRIMARY KEY,
        free_zone_id INTEGER NOT NULL,
        free_zone_name TEXT NOT NULL,
        field TEXT NOT NULL,
        priority INTEGER DEFAULT 5,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        result JSONB,
        UNIQUE(free_zone_id, field)
      );
    `;
    
    await pool.query(createTableQuery);
    
    console.log('Enrichment tasks table created successfully');
    
    await pool.end();
    
    console.log('Setup completed');
  } catch (error) {
    console.error('Error setting up enrichment tasks table:', error);
  }
}

setupEnrichmentTasksTable();