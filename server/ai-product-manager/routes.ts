/**
 * AI Product Manager API Routes
 * 
 * These routes provide analysis, enrichment, and deep audit functionality
 * for free zone data.
 */

import express from 'express';
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

// Get enrichment performance metrics
router.get('/enrichment-performance', async (req, res) => {
  try {
    // Provide simple mock metrics until the full implementation is ready
    const metrics = {
      tasksCompleted: 0,
      tasksSuccessful: 0,
      tasksFailed: 0,
      averageTaskDuration: 0,
      fieldsEnriched: 0,
      freeZonesImproved: 0,
      lastUpdate: new Date().toISOString()
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