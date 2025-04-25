/**
 * Run a comprehensive audit on Ajman Free Zone
 * 
 * This script checks document completeness for Ajman Free Zone
 * and compares document counts against DMCC as a benchmark.
 * It's designed to be used with the enrichment script to achieve 100% completeness.
 */

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Free Zone IDs
const AJMAN_FREE_ZONE_ID = 9;  // Ajman Free Zone
const DMCC_FREE_ZONE_ID = 14;  // DMCC - benchmark

// Key categories for document completeness with expanded list
const KEY_CATEGORIES = [
  'business_setup',
  'legal',
  'compliance',
  'financial',
  'visa_information',
  'license_types',
  'facilities',
  'benefits',
  'faq',
  'templates',
  'timelines',
  'industries',
  'trade',
  'requirements',
  'managing_your_business'
];

// Define minimum documents needed per category for completeness
const DOCUMENTS_NEEDED = {
  'business_setup': 6,
  'legal': 5,
  'compliance': 5,
  'financial': 5,
  'visa_information': 3,
  'license_types': 3,
  'facilities': 3,
  'benefits': 3,
  'faq': 2,
  'templates': 2,
  'timelines': 2,
  'industries': 2,
  'trade': 3,
  'requirements': 2,
  'managing_your_business': 5
};

// Save path for audit results that enrichment script can read
const AUDIT_RESULTS_PATH = path.join('freezone_docs', 'ajman_free_zone', 'audit_results.json');

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
    
    // Calculate completeness score based on documents and meeting the required document counts
    // This is a more stringent approach to ensure we achieve 100% only when all categories are fully covered
    
    // First, calculate the category completeness percentages
    const categoryCompleteness = {};
    let totalCompleteness = 0;
    let categoriesEvaluated = 0;
    
    KEY_CATEGORIES.forEach(category => {
      const currentCount = ajmanCategoryCounts[category] || 0;
      const targetCount = DOCUMENTS_NEEDED[category] || 3; // Default to 3 if not specified
      
      // Calculate percentage complete for this category
      const percentComplete = Math.min(100, Math.round((currentCount / targetCount) * 100));
      categoryCompleteness[category] = percentComplete;
      
      // Add to total completeness calculation
      totalCompleteness += percentComplete;
      categoriesEvaluated++;
    });
    
    // Calculate average completeness across all categories
    const completenessScore = Math.round(totalCompleteness / categoriesEvaluated);
    
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
    
    // Determine priority fields for enrichment based on category completeness
    // Use a copy of KEY_CATEGORIES to avoid modifying the original
    const categoriesWithCompletenessScore = KEY_CATEGORIES.map(category => {
      return {
        category,
        count: ajmanCategoryCounts[category] || 0,
        targetCount: DOCUMENTS_NEEDED[category] || 3,
        completeness: categoryCompleteness[category] || 0
      };
    });
    
    // Sort by completeness (ascending) and then by category importance (by array index)
    const sortedCategories = categoriesWithCompletenessScore.sort((a, b) => {
      // First sort by completeness (less complete items first)
      if (a.completeness !== b.completeness) {
        return a.completeness - b.completeness;
      }
      
      // If completeness is the same, sort by category importance
      return KEY_CATEGORIES.indexOf(a.category) - KEY_CATEGORIES.indexOf(b.category);
    });
    
    // Get categories that are not 100% complete
    const priorityFields = sortedCategories
      .filter(item => item.completeness < 100)
      .map(item => item.category);
    
    if (priorityFields.length > 0) {
      console.log('\n=== Enrichment Priorities ===');
      priorityFields.forEach((field, index) => {
        const categoryInfo = categoriesWithCompletenessScore.find(c => c.category === field);
        console.log(`${index + 1}. ${field}: ${categoryInfo.count}/${categoryInfo.targetCount} documents (${categoryInfo.completeness}% complete)`);
      });
    } else {
      console.log('\n=== No enrichment needed - All categories at 100% ===');
    }
    
    // Prepare the result object
    const result = {
      freeZoneId: AJMAN_FREE_ZONE_ID,
      freeZoneName: freeZone.name,
      totalDocuments: ajmanTotalDocs,
      categoryCounts: ajmanCategoryCounts,
      categoryCompleteness,
      completenessScore,
      priorityFields,
      categoryDetails: categoriesWithCompletenessScore,
      timestamp: new Date().toISOString(),
      isComplete: completenessScore === 100
    };
    
    // Ensure directory exists for saving results
    const dirPath = path.dirname(AUDIT_RESULTS_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
    
    // Save results to file for the enrichment script to use
    fs.writeFileSync(AUDIT_RESULTS_PATH, JSON.stringify(result, null, 2));
    console.log(`\nAudit results saved to: ${AUDIT_RESULTS_PATH}`);
    
    return result;
  } catch (error) {
    console.error('Error running Ajman Free Zone audit:', error);
  }
}

// Function to check if we're running in the main script or imported
async function main() {
  try {
    const result = await runAjmanAudit();
    console.log(`\n=== Audit Cycle Complete ===`);
    
    if (result && result.isComplete) {
      console.log(`\n🎉 SUCCESS: Ajman Free Zone completeness is now at 100%! 🎉`);
      console.log(`No further enrichment needed.`);
    } else if (result) {
      console.log(`Current completeness: ${result.completenessScore}%`);
      console.log(`Remaining priority categories: ${result.priorityFields.length}`);
      console.log(`\nRun 'node enrich-ajman-freezone.js' to continue the enrichment process.`);
    }
    
    return result;
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

// If this file is being run directly, execute the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export functions and constants for use by other modules
export { runAjmanAudit, AUDIT_RESULTS_PATH, KEY_CATEGORIES, DOCUMENTS_NEEDED };