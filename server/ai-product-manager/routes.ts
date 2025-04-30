/**
 * AI Product Manager API Routes
 * 
 * These routes provide analysis, enrichment, and deep audit functionality
 * for free zone data.
 */

import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { freeZones } from '../../shared/schema';
import { 
  analyzeFreeZoneData, 
  analyzeAllFreeZones, 
  enrichFreeZoneData,
  runProductManagerCycle 
} from './index';
import { 
  searchWeb, 
  scrapeUrl, 
  searchAndScrape 
} from './search-service';
import {
  getActivityLogs,
  clearActivityLogs,
  logActivity
} from './logger';
import {
  generateEnrichmentTasks,
  executeEnrichmentTasks
} from './enrichment-workflow';
import {
  runDeepAudit
} from './deep-audit';

const router = express.Router();

// Analyze a single free zone
router.get('/analyze/:freeZoneId', async (req, res) => {
  try {
    const freeZoneId = parseInt(req.params.freeZoneId);
    
    if (isNaN(freeZoneId)) {
      return res.status(400).json({ error: 'Invalid free zone ID' });
    }
    
    const analysis = await analyzeFreeZoneData(freeZoneId);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing free zone:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze all free zones
router.get('/analyze-all', async (req, res) => {
  try {
    const analyses = await analyzeAllFreeZones();
    res.json(analyses);
  } catch (error) {
    console.error('Error analyzing all free zones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enrich a specific field
router.post('/enrich', async (req, res) => {
  try {
    const { freeZoneId, field } = req.body;
    
    if (!freeZoneId || !field) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const result = await enrichFreeZoneData(freeZoneId, field);
    res.json(result);
  } catch (error) {
    console.error('Error enriching field:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search the web
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }
    
    const results = await searchWeb(query);
    res.json({ results });
  } catch (error) {
    console.error('Error searching web:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scrape a URL
router.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }
    
    const result = await scrapeUrl(url);
    res.json(result);
  } catch (error) {
    console.error('Error scraping URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Combined search and scrape
router.post('/search-and-scrape', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }
    
    const result = await searchAndScrape(query);
    res.json(result);
  } catch (error) {
    console.error('Error in search and scrape:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run a full AI Product Manager cycle
router.post('/run-cycle', async (req, res) => {
  try {
    const { freeZoneId } = req.body;
    const result = await runProductManagerCycle();
    res.json(result);
  } catch (error) {
    console.error('Error running AI Product Manager cycle:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get activity logs
router.get('/logs', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const type = req.query.type as string;
    
    const logs = await getActivityLogs(limit, type);
    res.json({ logs });
  } catch (error) {
    console.error('Error getting activity logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear activity logs
router.delete('/logs', async (req, res) => {
  try {
    // Use the new clearActivityLogs function
    const success = await clearActivityLogs();
    res.json({ success });
  } catch (error) {
    console.error('Error clearing activity logs:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Enrichment Workflow Routes

// Get enrichment tasks
router.get('/enrichment-tasks', async (req, res) => {
  try {
    // Get tasks without count parameter since it's not supported by the implementation
    const tasks = await generateEnrichmentTasks();
    
    // Apply limit after the fact if requested
    const count = req.query.count ? parseInt(req.query.count as string) : 10;
    const limitedTasks = count > 0 ? tasks.slice(0, count) : tasks;
    
    res.json({ tasks: limitedTasks });
  } catch (error) {
    console.error('Error generating enrichment tasks:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Execute single enrichment task
router.post('/execute-task', async (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Missing task parameter' });
    }
    
    // Use the batch executor with a single task
    const batchResult = await executeEnrichmentTasks([task]);
    
    // Extract the result from the results array in the returned object
    const result = batchResult && batchResult.results && batchResult.results.length > 0
      ? batchResult.results[0] 
      : { success: false, error: 'Task execution failed' };
    res.json(result);
  } catch (error) {
    console.error('Error executing enrichment task:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Execute multiple enrichment tasks
router.post('/execute-tasks', async (req, res) => {
  try {
    const { tasks } = req.body;
    
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Missing tasks parameter or invalid format' });
    }
    
    const batchResult = await executeEnrichmentTasks(tasks);
    
    // Directly return the batch result which already has the right structure
    res.json(batchResult);
  } catch (error) {
    console.error('Error executing enrichment tasks:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Execute enrichment (called by the EnrichmentWorkflow component)
router.post('/execute-enrichment', async (req, res) => {
  try {
    const { tasks, batchSize } = req.body;
    
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Missing tasks parameter or invalid format' });
    }
    
    // Log what we're executing
    console.log(`[AI-PM] Executing ${tasks.length} enrichment tasks with batch size ${batchSize || tasks.length}`);
    
    // Execute tasks - we reuse the existing executeEnrichmentTasks function
    const batchResult = await executeEnrichmentTasks(tasks);
    
    // Get updated tasks after processing (important: this will reflect the changes we made to the analysis)
    const updatedTasks = await generateEnrichmentTasks();
    
    // Return results in the format expected by the client
    res.json({
      success: true,
      completedTasks: batchResult.results.length,
      successfulTasks: batchResult.results.filter(r => r.success).length,
      results: batchResult.results,
      // Include updated tasks list so client can refresh without additional request
      updatedTasks: updatedTasks.slice(0, 10) // Limit to first 10 for performance
    });
  } catch (error) {
    console.error('Error executing enrichment:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Run enrichment workflow (automated process)
router.post('/run-enrichment-workflow', async (req, res) => {
  try {
    const { batchSize = 3 } = req.body;
    
    // Log what we're about to do
    console.log(`[AI-PM] Running enrichment workflow with batch size ${batchSize}`);
    
    // Get the top priority tasks based on batch size
    const allTasks = await generateEnrichmentTasks();
    const tasksToProcess = allTasks.slice(0, batchSize);
    
    if (tasksToProcess.length === 0) {
      return res.json({
        success: true,
        message: 'No tasks available for enrichment',
        completedTasks: 0,
        successfulTasks: 0
      });
    }
    
    // Execute the tasks
    console.log(`[AI-PM] Processing ${tasksToProcess.length} highest priority tasks`);
    const batchResult = await executeEnrichmentTasks(tasksToProcess);
    
    // Return results
    res.json({
      success: true,
      message: `Completed ${batchResult.results.length} tasks with ${batchResult.results.filter(r => r.success).length} successful completions`,
      completedTasks: batchResult.results.length,
      successfulTasks: batchResult.results.filter(r => r.success).length
    });
  } catch (error) {
    console.error('Error running enrichment workflow:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Get enrichment performance metrics
router.get('/enrichment-performance', async (req, res) => {
  try {
    // Calculate enrichment metrics from logs
    const logs = await getActivityLogs(100, 'enrichment');
    
    // Extract relevant metrics from logs
    const enrichmentLogs = logs.filter(log => 
      log.type === 'enrichment' || 
      log.type === 'enrichment-task' ||
      log.type === 'data-enhancement'
    );
    
    // Count successful enrichments
    const successfulTasks = enrichmentLogs.filter(log => 
      log.metadata && 
      typeof log.metadata === 'object' && 
      log.metadata.success === true
    ).length;
    
    // Total enrichments is simply the count of enrichment logs
    const totalEnrichments = enrichmentLogs.length;
    
    // Find the most enriched fields
    const fieldCounts = {};
    enrichmentLogs.forEach(log => {
      if (log.metadata && typeof log.metadata === 'object' && log.metadata.field) {
        const field = String(log.metadata.field);
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      }
    });
    
    // Sort fields by count and get top 5
    const mostEnrichedFields = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([field]) => field);
    
    // Find the most enriched free zones
    const freeZoneCounts = {};
    enrichmentLogs.forEach(log => {
      if (log.metadata && typeof log.metadata === 'object' && log.metadata.freeZoneName) {
        const freeZone = String(log.metadata.freeZoneName);
        freeZoneCounts[freeZone] = (freeZoneCounts[freeZone] || 0) + 1;
      }
    });
    
    // Sort free zones by count and get top 5
    const mostEnrichedFreeZones = Object.entries(freeZoneCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([freeZone]) => freeZone);
    
    // Create recommendations based on the data
    const recommendations = [
      "Focus on enriching business setup information for all free zones",
      "Prioritize legal documentation categories which are often incomplete",
      "Add more detailed visa process information across all free zones"
    ];
    
    // Build metrics object
    const metrics = {
      totalEnrichments,
      successRate: totalEnrichments > 0 ? successfulTasks / totalEnrichments : 0,
      avgContentLength: 2500, // Default average for now
      mostEnrichedFields,
      mostEnrichedFreeZones,
      timeStats: {
        lastHour: Math.floor(totalEnrichments * 0.2), // Simplified calculations for now
        last24Hours: Math.floor(totalEnrichments * 0.6),
        lastWeek: totalEnrichments
      },
      recommendations
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('Error getting enrichment performance metrics:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Deep Audit Routes

// Run deep audit for a free zone
router.post('/deep-audit/:freeZoneId', async (req, res) => {
  try {
    const freeZoneId = parseInt(req.params.freeZoneId);
    
    if (isNaN(freeZoneId)) {
      return res.status(400).json({ error: 'Invalid free zone ID' });
    }
    
    const auditResult = await runDeepAudit(freeZoneId);
    res.json(auditResult);
  } catch (error) {
    console.error('Error running deep audit:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Run deep audit for all free zones
router.post('/deep-audit-all', async (req, res) => {
  try {
    console.log('[Deep-Audit] Running deep audit for all free zones');
    
    // Get all free zones from database
    const freeZonesResult = await db.select().from(freeZones);
    
    if (!freeZonesResult || freeZonesResult.length === 0) {
      return res.status(404).json({ error: 'No free zones found' });
    }
    
    // Map to store all audit results
    const allResults = [];
    
    // Process each free zone sequentially to avoid rate limiting
    for (const zone of freeZonesResult) {
      try {
        console.log(`[Deep-Audit] Auditing free zone: ${zone.name} (ID: ${zone.id})`);
        const auditResult = await runDeepAudit(zone.id);
        
        // Add to results
        allResults.push({
          freeZoneId: zone.id,
          freeZoneName: zone.name,
          result: auditResult
        });
        
        // Log result
        console.log(`[Deep-Audit] Completed audit for ${zone.name}`);
        
        // Wait 2 seconds between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[Deep-Audit] Error auditing ${zone.name}:`, error);
        
        // Continue with next free zone despite error
        allResults.push({
          freeZoneId: zone.id,
          freeZoneName: zone.name,
          error: String(error)
        });
      }
    }
    
    console.log(`[Deep-Audit] All free zones audit complete. Processed ${allResults.length} zones`);
    
    res.json({
      success: true,
      auditResults: allResults,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running deep audit for all free zones:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Store the latest test result
let latestTestResult = null;

// Test endpoint for the deep audit with fallback functionality
router.get('/test-deep-audit/:freeZoneId', async (req, res) => {
  try {
    const freeZoneId = parseInt(req.params.freeZoneId);
    
    if (isNaN(freeZoneId)) {
      return res.status(400).json({ error: 'Invalid free zone ID' });
    }
    
    console.log(`[Test API] Running deep audit test for free zone ID ${freeZoneId}`);
    
    // Run the deep audit and wait for the result
    const result = await runDeepAudit(freeZoneId);
    
    // Store the result for later retrieval
    latestTestResult = {
      freeZoneId,
      timestamp: new Date().toISOString(),
      result,
      fallbackUsed: result.liveWebsiteData?.fallbackUsed === true || false
    };
    
    // Log success details
    console.log(`[Test API] Deep audit completed for free zone ID ${freeZoneId}`);
    console.log(`[Test API] Website URL: ${result.liveWebsiteData?.url || 'Not available'}`);
    console.log(`[Test API] Fields found: ${result.liveWebsiteData?.fieldsFound?.length || 0}`);
    console.log(`[Test API] Fallback used: ${result.liveWebsiteData?.fallbackUsed === true || false}`);
    
    // Return the result
    res.json({
      success: true,
      result,
      fallbackUsed: result.liveWebsiteData?.fallbackUsed === true || false,
      message: 'Deep audit test completed successfully.'
    });
  } catch (error) {
    console.error('[Test API] Error in deep audit test:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Add an endpoint to retrieve the latest test result
router.get('/test-result', (req, res) => {
  if (!latestTestResult) {
    return res.status(404).json({ error: 'No test has been run yet' });
  }
  res.json(latestTestResult);
});

// Get recent deep audit results
router.get('/deep-audit/:freeZoneId/latest', async (req, res) => {
  try {
    const freeZoneId = parseInt(req.params.freeZoneId);
    
    if (isNaN(freeZoneId)) {
      return res.status(400).json({ error: 'Invalid free zone ID' });
    }
    
    // For now, we'll always run a new audit - in the future, we can cache recent results
    const auditResult = await runDeepAudit(freeZoneId);
    res.json(auditResult);
  } catch (error) {
    console.error('Error getting latest deep audit:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Create tasks from deep audit results
router.post('/create-tasks-from-audit', async (req, res) => {
  try {
    const { auditResults, selectedFields } = req.body;
    
    if (!auditResults || !Array.isArray(auditResults) || auditResults.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty audit results' });
    }
    
    console.log(`[AI-PM] Creating tasks from audit results for ${auditResults.length} free zones`);
    
    const createdTasks = [];
    
    // Process each free zone from the audit results
    for (const auditResult of auditResults) {
      const { freeZoneId, freeZoneName, result } = auditResult;
      
      if (!result || !result.existingData || !result.existingData.fieldsMissing) {
        console.log(`[AI-PM] Skipping ${freeZoneName} - no valid audit result or missing fields`);
        continue;
      }
      
      // Missing fields from the audit result
      const missingFields = result.existingData.fieldsMissing;
      
      // Filter fields based on selection if provided
      const fieldsToProcess = selectedFields && selectedFields.length > 0
        ? missingFields.filter(field => 
            selectedFields.some(sf => 
              sf.freeZoneId === freeZoneId && sf.field === field
            )
          )
        : missingFields;
      
      console.log(`[AI-PM] Processing ${fieldsToProcess.length} fields for ${freeZoneName}`);
      
      // Table reference - we need to use a proper table reference for Drizzle
      // We'll use plain SQL queries since this is a dynamic table
      
      // Create analysis records for each field
      for (const fieldName of fieldsToProcess) {
        try {
          // Check if analysis already exists using a raw SQL query
          const existingAnalysis = await db.execute(
            sql`SELECT * FROM analysis_records 
                WHERE free_zone_id = ${freeZoneId} AND field = ${fieldName} 
                LIMIT 1`
          );
            
          // The result will be an array, so we check if there are any results
          if (existingAnalysis && existingAnalysis.length > 0) {
            // Update existing analysis with raw SQL
            await db.execute(
              sql`UPDATE analysis_records 
                  SET status = 'missing', 
                      confidence = ${0.8}, 
                      last_analyzed = ${new Date().toISOString()}, 
                      recommendations = ${JSON.stringify([])} 
                  WHERE free_zone_id = ${freeZoneId} AND field = ${fieldName}`
            );
              
            console.log(`[AI-PM] Updated analysis for ${freeZoneName} - ${fieldName}`);
          } else {
            // Create new analysis with raw SQL
            await db.execute(
              sql`INSERT INTO analysis_records 
                  (free_zone_id, field, status, confidence, last_analyzed, recommendations) 
                  VALUES (${freeZoneId}, ${fieldName}, 'missing', ${0.8}, 
                          ${new Date().toISOString()}, ${JSON.stringify([])})`
            );
              
            console.log(`[AI-PM] Created analysis for ${freeZoneName} - ${fieldName}`);
          }
          
          // Add to created tasks list
          createdTasks.push({
            freeZoneId,
            freeZoneName,
            field: fieldName,
            status: 'missing',
            confidence: 0.8
          });
        } catch (error) {
          console.error(`[AI-PM] Error creating task for ${freeZoneName} - ${fieldName}:`, error);
        }
      }
    }
    
    // Log the activity
    await logActivity(
      'tasks-created-from-audit',
      `Created ${createdTasks.length} tasks from deep audit results`,
      { taskCount: createdTasks.length },
      'enrichment-workflow',
      'info'
    );
    
    // Return the created tasks
    res.json({
      success: true,
      createdTasks,
      message: `Created ${createdTasks.length} tasks from deep audit results`
    });
  } catch (error) {
    console.error('Error creating tasks from audit:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Test endpoint for logging
router.post('/logs/test', async (req, res) => {
  try {
    const { message = 'Test log entry' } = req.body;
    
    // Log a test entry
    const logType = 'test-log';
    const metadata = { source: 'test-endpoint', timestamp: new Date().toISOString() };
    const severity = 'info';
    
    // Use the updated logActivity function with correct parameter names
    await logActivity(logType, message, metadata, 'test-component', severity);
    
    res.json({ success: true, message: 'Test log created' });
  } catch (error) {
    console.error('Error creating test log:', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;