import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import pg from 'pg';
const { Client } = pg;

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function createUser() {
  const username = 'testadmin';
  const password = 'testadmin';
  const hashedPassword = await hashPassword(password);
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    
    // Check if user exists
    const checkQuery = `SELECT * FROM users WHERE username = $1`;
    const checkResult = await client.query(checkQuery, [username]);
    
    let result;
    
    if (checkResult.rows.length > 0) {
      // Update existing user
      const updateQuery = `
        UPDATE users 
        SET password = $1, company_name = $2, role = $3 
        WHERE username = $4
        RETURNING *
      `;
      const updateValues = [hashedPassword, 'Test Company', 'admin', username];
      result = await client.query(updateQuery, updateValues);
      console.log('User updated:', result.rows[0]);
    } else {
      // Create new user
      const insertQuery = `
        INSERT INTO users (username, password, company_name, progress, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const insertValues = [username, hashedPassword, 'Test Company', 0, 'admin'];
      result = await client.query(insertQuery, insertValues);
      console.log('User created:', result.rows[0]);
    }
  } catch (error) {
    console.error('Error managing user:', error);
  } finally {
    await client.end();
  }
}

createUser().catch(console.error);