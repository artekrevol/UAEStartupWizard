/**
 * Run a simplified audit on Ajman Free Zone
 * 
 * This script checks document completeness for Ajman Free Zone
 * and compares document counts against DMCC as a benchmark.
 */

const { db } = require('./server/db');
const { sql } = require('drizzle-orm');

// Free Zone IDs
const AJMAN_FREE_ZONE_ID = 9;  // Ajman Free Zone
const DMCC_FREE_ZONE_ID = 14;  // DMCC - benchmark

// Key categories for document completeness
const KEY_CATEGORIES = [
  'business_setup',
  'legal',
  'compliance',
  'financial',
  'visa_information',
  'license_types',
  'facilities',
  'benefits'
];

async function runAjmanAudit() {
  try {
    console.log('Starting document completeness audit for Ajman Free Zone');
    
    // Get free zone details
    const freeZoneResult = await db.execute(
      sql`SELECT id, name, website FROM free_zones WHERE id = ${AJMAN_FREE_ZONE_ID}`
    );
    
    if (!freeZoneResult.rows || freeZoneResult.rows.length === 0) {
      console.error(`Free zone with ID ${AJMAN_FREE_ZONE_ID} not found`);
      process.exit(1);
    }
    
    const freeZone = freeZoneResult.rows[0];
    console.log(`Found free zone: ${freeZone.name}`);
    
    // Get DMCC details for comparison
    const dmccResult = await db.execute(
      sql`SELECT id, name FROM free_zones WHERE id = ${DMCC_FREE_ZONE_ID}`
    );
    
    if (!dmccResult.rows || dmccResult.rows.length === 0) {
      console.log('DMCC not found for comparison, proceeding with just Ajman analysis');
    } else {
      console.log(`Using ${dmccResult.rows[0].name} as benchmark for comparison`);
    }
    
    // Get document counts by category for Ajman
    const ajmanDocsResult = await db.execute(
      sql`SELECT category, COUNT(*) as count 
          FROM documents 
          WHERE free_zone_id = ${AJMAN_FREE_ZONE_ID}
          GROUP BY category`
    );
    
    // Get document counts by category for DMCC
    const dmccDocsResult = await db.execute(
      sql`SELECT category, COUNT(*) as count 
          FROM documents 
          WHERE free_zone_id = ${DMCC_FREE_ZONE_ID}
          GROUP BY category`
    );
    
    // Process Ajman document counts
    const ajmanCategoryCounts = {};
    let ajmanTotalDocs = 0;
    
    ajmanDocsResult.rows.forEach(row => {
      const category = row.category || 'uncategorized';
      ajmanCategoryCounts[category] = row.count;
      ajmanTotalDocs += parseInt(row.count);
    });
    
    // Process DMCC document counts
    const dmccCategoryCounts = {};
    let dmccTotalDocs = 0;
    
    dmccDocsResult.rows.forEach(row => {
      const category = row.category || 'uncategorized';
      dmccCategoryCounts[category] = row.count;
      dmccTotalDocs += parseInt(row.count);
    });
    
    // Calculate completeness score based on documents
    let completenessScore = 0;
    
    // Calculate base score from total document count
    if (ajmanTotalDocs >= 30) {
      completenessScore = 60;
    } else if (ajmanTotalDocs >= 15) {
      completenessScore = 45;
    } else if (ajmanTotalDocs >= 5) {
      completenessScore = 30;
    } else if (ajmanTotalDocs > 0) {
      completenessScore = 15;
    }
    
    // Add points for each key category with documents
    KEY_CATEGORIES.forEach(category => {
      if (ajmanCategoryCounts[category] && ajmanCategoryCounts[category] > 2) {
        completenessScore += 5;
      } else if (ajmanCategoryCounts[category] && ajmanCategoryCounts[category] > 0) {
        completenessScore += 2;
      }
    });
    
    // Cap at 100%
    completenessScore = Math.min(completenessScore, 100);
    
    // Output the results
    console.log('\n=== Ajman Free Zone Document Analysis ===');
    console.log(`Total documents: ${ajmanTotalDocs}`);
    console.log('Documents by category:');
    Object.entries(ajmanCategoryCounts).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    
    console.log('\nKey categories coverage:');
    KEY_CATEGORIES.forEach(category => {
      const count = ajmanCategoryCounts[category] || 0;
      const status = count > 2 ? 'Complete' : count > 0 ? 'Partial' : 'Missing';
      console.log(`  ${category}: ${status} (${count} documents)`);
    });
    
    if (dmccDocsResult.rows && dmccDocsResult.rows.length > 0) {
      console.log('\n=== Comparison with DMCC (Benchmark) ===');
      console.log(`DMCC total documents: ${dmccTotalDocs}`);
      console.log('DMCC documents by category:');
      Object.entries(dmccCategoryCounts).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
      });
      
      console.log('\nCoverage comparison (Ajman vs DMCC):');
      KEY_CATEGORIES.forEach(category => {
        const ajmanCount = ajmanCategoryCounts[category] || 0;
        const dmccCount = dmccCategoryCounts[category] || 0;
        const percentCoverage = dmccCount > 0 ? Math.round((ajmanCount / dmccCount) * 100) : 0;
        console.log(`  ${category}: ${ajmanCount}/${dmccCount} (${percentCoverage}% of DMCC)`);
      });
    }
    
    console.log('\n=== Completeness Assessment ===');
    console.log(`Estimated completeness score: ${completenessScore}%`);
    
    // Determine priority fields for enrichment
    const priorityFields = KEY_CATEGORIES
      .filter(category => !ajmanCategoryCounts[category] || ajmanCategoryCounts[category] < 2)
      .sort((a, b) => {
        // Sort by (1) missing vs. partial, (2) importance
        const aCount = ajmanCategoryCounts[a] || 0;
        const bCount = ajmanCategoryCounts[b] || 0;
        
        if (aCount === 0 && bCount > 0) return -1;
        if (bCount === 0 && aCount > 0) return 1;
        
        // Key categories are already sorted by importance
        return KEY_CATEGORIES.indexOf(a) - KEY_CATEGORIES.indexOf(b);
      });
    
    if (priorityFields.length > 0) {
      console.log('\n=== Enrichment Priorities ===');
      priorityFields.forEach((field, index) => {
        const count = ajmanCategoryCounts[field] || 0;
        const status = count > 0 ? 'Enhance' : 'Add';
        console.log(`${index + 1}. ${status} ${field} information`);
      });
    }
    
    return {
      freeZoneId: AJMAN_FREE_ZONE_ID,
      freeZoneName: freeZone.name,
      totalDocuments: ajmanTotalDocs,
      categoryCounts: ajmanCategoryCounts,
      completenessScore,
      priorityFields
    };
  } catch (error) {
    console.error('Error running Ajman Free Zone audit:', error);
  }
}

// Run the audit
runAjmanAudit();