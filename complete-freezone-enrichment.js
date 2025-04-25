/**
 * Complete Free Zone Enrichment Script
 * 
 * This script coordinates the entire enrichment process:
 * 1. Run initial audit to determine baseline completeness
 * 2. Run iterative enrichment cycles until 100% completeness is reached
 * 3. Generate a final report on the enrichment process
 */

import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = util.promisify(exec);

// Configuration
const AUDIT_SCRIPT = './run-ajman-audit.js';
const ENRICHMENT_SCRIPT = './enrich-ajman-freezone.js';
const AUDIT_RESULTS_PATH = path.join('freezone_docs', 'ajman_free_zone', 'audit_results.json');
const FINAL_REPORT_PATH = path.join('freezone_docs', 'ajman_free_zone', 'enrichment_report.json');

// Main function to run the complete enrichment process
async function runCompleteEnrichment() {
  try {
    console.log('='.repeat(80));
    console.log('STARTING COMPLETE FREE ZONE ENRICHMENT PROCESS');
    console.log('='.repeat(80));
    console.log('\nThis process will:');
    console.log('1. Run an initial audit to determine baseline completeness');
    console.log('2. Run enrichment cycles until 100% completeness is reached');
    console.log('3. Generate a final report on the enrichment process');
    console.log('\n' + '='.repeat(80));
    
    // Capture start time
    const startTime = new Date();
    
    // Step 1: Run initial audit
    console.log('\n>>> STEP 1: RUNNING INITIAL AUDIT');
    try {
      const { stdout: auditOutput } = await execPromise(`node ${AUDIT_SCRIPT}`);
      console.log(auditOutput);
      
      // Check audit results
      if (fs.existsSync(AUDIT_RESULTS_PATH)) {
        const initialAudit = JSON.parse(fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8'));
        console.log(`Initial completeness: ${initialAudit.completenessScore}%`);
        
        // If already at 100%, we can stop
        if (initialAudit.isComplete) {
          console.log('\n✅ FREE ZONE ALREADY AT 100% COMPLETENESS');
          generateReport(initialAudit, initialAudit, 0, startTime);
          return;
        }
      } else {
        console.warn('Warning: Audit completed but no results file found.');
      }
    } catch (auditError) {
      console.error('Error running initial audit:', auditError);
      process.exit(1);
    }
    
    // Step 2: Run enrichment until 100% complete
    console.log('\n>>> STEP 2: RUNNING ENRICHMENT CYCLES');
    try {
      const { stdout: enrichmentOutput } = await execPromise(`node ${ENRICHMENT_SCRIPT}`);
      console.log(enrichmentOutput);
    } catch (enrichmentError) {
      console.error('Error in enrichment process:', enrichmentError);
    }
    
    // Step 3: Run final audit to confirm results
    console.log('\n>>> STEP 3: RUNNING FINAL VERIFICATION AUDIT');
    let finalAudit;
    try {
      const { stdout: finalAuditOutput } = await execPromise(`node ${AUDIT_SCRIPT}`);
      console.log(finalAuditOutput);
      
      if (fs.existsSync(AUDIT_RESULTS_PATH)) {
        finalAudit = JSON.parse(fs.readFileSync(AUDIT_RESULTS_PATH, 'utf8'));
        console.log(`Final completeness: ${finalAudit.completenessScore}%`);
      }
    } catch (finalAuditError) {
      console.error('Error running final audit:', finalAuditError);
    }
    
    // Generate final report
    const initialAudit = getInitialAudit();
    generateReport(initialAudit, finalAudit, (new Date() - startTime) / 1000, startTime);
    
    console.log('\n' + '='.repeat(80));
    console.log('ENRICHMENT PROCESS COMPLETED');
    console.log(`Final report saved to: ${FINAL_REPORT_PATH}`);
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Error in complete enrichment process:', error);
  }
}

// Helper to get the initial audit data from the saved backup
function getInitialAudit() {
  const backupPath = path.join('freezone_docs', 'ajman_free_zone', 'initial_audit.json');
  
  if (fs.existsSync(backupPath)) {
    return JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  }
  
  // If no backup exists, return a placeholder
  return {
    completenessScore: 0,
    priorityFields: [],
    timestamp: new Date().toISOString()
  };
}

// Generate a comprehensive report on the enrichment process
function generateReport(initialAudit, finalAudit, durationSeconds, startTime) {
  const endTime = new Date();
  
  const report = {
    process: {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: durationSeconds,
      durationFormatted: formatDuration(durationSeconds)
    },
    initial: {
      completenessScore: initialAudit?.completenessScore || 0,
      priorityFields: initialAudit?.priorityFields || [],
      timestamp: initialAudit?.timestamp || startTime.toISOString()
    },
    final: {
      completenessScore: finalAudit?.completenessScore || 0,
      priorityFields: finalAudit?.priorityFields || [],
      isComplete: finalAudit?.isComplete || false,
      timestamp: finalAudit?.timestamp || endTime.toISOString()
    },
    improvement: {
      scoreIncrease: (finalAudit?.completenessScore || 0) - (initialAudit?.completenessScore || 0),
      priorityFieldsResolved: 
        (initialAudit?.priorityFields?.length || 0) - (finalAudit?.priorityFields?.length || 0)
    },
    summary: {
      status: finalAudit?.isComplete ? 'SUCCESS' : 'INCOMPLETE',
      message: finalAudit?.isComplete 
        ? 'Free zone data is now 100% complete!'
        : `Free zone data enrichment improved completeness to ${finalAudit?.completenessScore || 0}%`
    }
  };
  
  // Save report to file
  const reportDir = path.dirname(FINAL_REPORT_PATH);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(FINAL_REPORT_PATH, JSON.stringify(report, null, 2));
  
  // Save initial audit backup for future reference
  if (initialAudit) {
    const backupPath = path.join('freezone_docs', 'ajman_free_zone', 'initial_audit.json');
    fs.writeFileSync(backupPath, JSON.stringify(initialAudit, null, 2));
  }
  
  // Print summary
  console.log('\n=== ENRICHMENT PROCESS SUMMARY ===');
  console.log(`Initial completeness: ${report.initial.completenessScore}%`);
  console.log(`Final completeness: ${report.final.completenessScore}%`);
  console.log(`Improvement: +${report.improvement.scoreIncrease}%`);
  console.log(`Duration: ${report.process.durationFormatted}`);
  console.log(`Status: ${report.summary.status}`);
  console.log(`Message: ${report.summary.message}`);
}

// Format duration in seconds to human-readable format
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)} seconds`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} minutes ${Math.round(seconds % 60)} seconds`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${hours} hours ${minutes} minutes ${remainingSeconds} seconds`;
  }
}

// Run the complete enrichment process
runCompleteEnrichment();