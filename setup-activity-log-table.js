/**
 * Setup Activity Logs Table
 * 
 * This script creates the activity_logs table for the AI Product Manager
 */

import pg from 'pg';
const { Pool } = pg;

async function setupActivityLogsTable() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('Creating activity_logs table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        component TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    await pool.query(createTableQuery);
    
    console.log('Activity logs table created successfully');
    
    // Create a test log
    const timestamp = new Date().toISOString();
    const insertQuery = `
      INSERT INTO activity_logs (type, component, message, severity, metadata)
      VALUES ('test', 'setup-script', 'Initial setup completed', 'info', '{"setupTime": "${timestamp}"}')
    `;
    
    await pool.query(insertQuery);
    console.log('Test log entry created');
    
    await pool.end();
    
    console.log('Setup completed');
  } catch (error) {
    console.error('Error setting up activity logs table:', error);
  }
}

setupActivityLogsTable();