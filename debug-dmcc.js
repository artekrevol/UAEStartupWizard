/**
 * Debug script to analyze DMCC data directly
 * This script bypasses the AI Product Manager's completeness logic
 * and directly calculates completeness based on document count
 */

import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function debugDMCCData() {
  console.log('Starting DMCC Debug Script');
  
  try {
    // 1. Get DMCC free zone ID
    const freeZoneResult = await pool.query(
      `SELECT id, name FROM free_zones WHERE name ILIKE '%Dubai Multi Commodities%'`
    );
    
    if (freeZoneResult.rows.length === 0) {
      console.error('No DMCC free zone found');
      return;
    }
    
    const freeZone = freeZoneResult.rows[0];
    console.log(`Found free zone: ${freeZone.name} (ID: ${freeZone.id})`);
    
    // 2. Count DMCC documents by category
    const documentCountResult = await pool.query(
      `SELECT category, COUNT(*) FROM documents 
       WHERE free_zone_id = $1 
       GROUP BY category`,
      [freeZone.id]
    );
    
    console.log('\nDocument counts by category:');
    const categories = {};
    let totalDocuments = 0;
    
    documentCountResult.rows.forEach(row => {
      categories[row.category] = parseInt(row.count);
      totalDocuments += parseInt(row.count);
      console.log(`${row.category}: ${row.count} documents`);
    });
    
    console.log(`\nTotal documents: ${totalDocuments}`);
    
    // 3. Calculate completeness score
    let completenessScore = 0;
    
    // Base score from total documents
    if (totalDocuments >= 30) {
      completenessScore = 60;
    } else if (totalDocuments >= 15) {
      completenessScore = 50;
    } else if (totalDocuments >= 5) {
      completenessScore = 40;
    } else {
      completenessScore = totalDocuments * 5; // 5% per document up to 20%
    }
    
    console.log(`\nBase completeness from document count: ${completenessScore}%`);
    
    // Additional points for document categories
    const categoryScores = {
      'business_setup': categories['business_setup'] > 3 ? 15 : 0,
      'legal': categories['legal'] > 3 ? 15 : 0,
      'compliance': categories['compliance'] > 3 ? 10 : 0,
      'financial': categories['financial'] > 3 ? 10 : 0
    };
    
    let categoryTotal = 0;
    console.log('\nCategory scores:');
    Object.keys(categoryScores).forEach(category => {
      console.log(`${category}: ${categoryScores[category]}%`);
      categoryTotal += categoryScores[category];
    });
    
    completenessScore += categoryTotal;
    console.log(`\nAdditional points from categories: ${categoryTotal}%`);
    
    // Cap at 100%
    completenessScore = Math.min(100, completenessScore);
    console.log(`\nFinal completeness score: ${completenessScore}%`);
    
    // 4. Update the database with this score for testing purposes
    const updateResult = await pool.query(
      `INSERT INTO activity_logs 
       (type, description, metadata, source, level)
       VALUES ('debug-completeness', 
               $1, 
               $2, 
               'debug-script',
               'info')`,
      [
        `DMCC debug completeness: ${completenessScore}%`, 
        JSON.stringify({
          freeZoneId: freeZone.id,
          documentCount: totalDocuments,
          categories,
          categoryScores,
          completenessScore
        })
      ]
    );
    
    console.log('Debug results logged to activity_logs table');
    
  } catch (error) {
    console.error('Error running debug script:', error);
  } finally {
    pool.end();
  }
}

// Run the script
debugDMCCData();