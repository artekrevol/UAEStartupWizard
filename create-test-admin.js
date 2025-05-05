/**
 * This script creates a test admin user with a known password
 * for testing API endpoints that require authentication
 */

import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import pg from 'pg';
const { Pool } = pg;

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function createTestAdmin() {
  // Use environment variables for admin credentials
  const username = process.env.ADMIN_USERNAME || 'admin';
  // Generate a secure random password if not provided
  const password = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(16).toString('hex');
  const hashedPassword = await hashPassword(password);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    console.log('Creating test admin user...');
    
    // Check if user exists
    const checkQuery = `SELECT * FROM users WHERE username = $1`;
    const checkResult = await pool.query(checkQuery, [username]);
    
    let result;
    
    if (checkResult.rows.length > 0) {
      // Update existing user
      const updateQuery = `
        UPDATE users 
        SET password = $1, company_name = $2, role = $3 
        WHERE username = $4
        RETURNING *
      `;
      const updateValues = [hashedPassword, 'UAE Business Assistant', 'admin', username];
      result = await pool.query(updateQuery, updateValues);
      console.log('Admin user updated:', result.rows[0].username);
    } else {
      // Create new user
      const insertQuery = `
        INSERT INTO users (username, password, company_name, progress, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const insertValues = [username, hashedPassword, 'UAE Business Assistant', 0, 'admin'];
      result = await pool.query(insertQuery, insertValues);
      console.log('Admin user created:', result.rows[0].username);
    }
    
    console.log('Admin user ready with the following credentials:');
    console.log('Username:', username);
    console.log('Password:', password);
    
    await pool.end();
  } catch (error) {
    console.error('Error creating test admin user:', error);
  }
}

createTestAdmin().catch(console.error);