/**
 * Run a deep audit on Ajman Free Zone
 * 
 * This script uses the AI Product Manager to analyze Ajman Free Zone data
 * for completeness and quality, similar to how DMCC was analyzed.
 */

import { db } from './server/db.js';
import { deepAudit } from './server/ai-product-manager/deep-audit.js';

const FREE_ZONE_ID = 9; // Ajman Free Zone

async function runAjmanAudit() {
  try {
    console.log(`Starting deep audit for Ajman Free Zone (ID: ${FREE_ZONE_ID})`);
    
    // Get the free zone details
    const freeZoneResult = await db.execute(`
      SELECT id, name, website FROM free_zones WHERE id = ${FREE_ZONE_ID}
    `);
    
    if (!freeZoneResult.rows || freeZoneResult.rows.length === 0) {
      console.error(`Free zone with ID ${FREE_ZONE_ID} not found`);
      process.exit(1);
    }
    
    const freeZone = freeZoneResult.rows[0];
    console.log(`Found free zone: ${freeZone.name}`);
    
    // Run deep audit
    console.log('Running deep audit...');
    const auditResult = await deepAudit(FREE_ZONE_ID);
    
    console.log('Deep audit completed!');
    console.log('Results:');
    console.log(`Overall completeness: ${auditResult.overallCompleteness}%`);
    console.log('Field completeness:');
    
    // Display field completeness
    Object.entries(auditResult.fields).forEach(([field, data]) => {
      console.log(`  ${field}: ${data.completeness}% - ${data.status}`);
    });
    
    // Return the result
    return auditResult;
  } catch (error) {
    console.error('Error running Ajman Free Zone audit:', error);
  }
}

// Run the audit
runAjmanAudit();