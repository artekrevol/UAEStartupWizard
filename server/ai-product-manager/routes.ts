/**
 * AI Product Manager API Routes
 * 
 * This file defines the API routes for the AI Product Manager functionality,
 * including analysis, enrichment, metrics, and the intelligent enrichment workflow.
 */

import express from 'express';
import { 
  analyzeFreeZoneData, 
  analyzeAllFreeZones, 
  enrichFreeZoneData, 
  runScraperForFreeZone,
  getProductRecommendations,
  runProductManagerCycle
} from './index';
import {
  generateEnrichmentTasks,
  executeEnrichmentTasks,
  runIntelligentEnrichmentWorkflow,
  analyzeEnrichmentPerformance
} from './enrichment-workflow';
import { logActivity, getActivityLogs } from './logger';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Get analysis for a specific free zone
router.get('/analyze/:freeZoneId', async (req, res) => {
  try {
    const freeZoneId = parseInt(req.params.freeZoneId);
    
    if (isNaN(freeZoneId)) {
      return res.status(400).json({ error: 'Invalid free zone ID' });
    }
    
    const analysis = await analyzeFreeZoneData(freeZoneId);
    
    // Store the analysis in the database for historical tracking
    await db.execute(sql`
      INSERT INTO free_zone_analysis (
        free_zone_id, overall_completeness, fields, created_at
      ) VALUES (
        ${freeZoneId},
        ${analysis.overallCompleteness},
        ${JSON.stringify(analysis.fields)},
        ${new Date().toISOString()}
      )
    `);
    
    return res.json(analysis);
  } catch (error) {
    console.error(`Error analyzing free zone: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Get analysis for all free zones
router.get('/analyze-all', async (req, res) => {
  try {
    const analysis = await analyzeAllFreeZones();
    return res.json(analysis);
  } catch (error) {
    console.error(`Error analyzing all free zones: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Enrich data for a specific field
router.post('/enrich', async (req, res) => {
  try {
    const { freeZoneId, field } = req.body;
    
    if (!freeZoneId || !field) {
      return res.status(400).json({ error: 'Free zone ID and field are required' });
    }
    
    const result = await enrichFreeZoneData(parseInt(freeZoneId), field);
    return res.json(result);
  } catch (error) {
    console.error(`Error enriching data: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Run scraper for a specific free zone
router.post('/scrape', async (req, res) => {
  try {
    const { freeZoneName, url } = req.body;
    
    if (!freeZoneName || !url) {
      return res.status(400).json({ error: 'Free zone name and URL are required' });
    }
    
    const result = await runScraperForFreeZone(freeZoneName, url);
    return res.json(result);
  } catch (error) {
    console.error(`Error running scraper: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Get product recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await getProductRecommendations();
    return res.json(recommendations);
  } catch (error) {
    console.error(`Error getting recommendations: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Run a full product manager cycle
router.post('/run-cycle', async (req, res) => {
  try {
    const result = await runProductManagerCycle();
    return res.json(result);
  } catch (error) {
    console.error(`Error running product manager cycle: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Get activity logs
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50, type } = req.query;
    const logs = await getActivityLogs(parseInt(limit as string), type as string);
    return res.json({ logs });
  } catch (error) {
    console.error(`Error getting logs: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// NEW INTELLIGENT ENRICHMENT WORKFLOW ROUTES

// Generate enrichment tasks
router.get('/enrichment-tasks', async (req, res) => {
  try {
    const tasks = await generateEnrichmentTasks();
    return res.json({ tasks });
  } catch (error) {
    console.error(`Error generating enrichment tasks: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Execute a batch of enrichment tasks
router.post('/execute-enrichment', async (req, res) => {
  try {
    const { tasks, batchSize = 3 } = req.body;
    
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Valid tasks array is required' });
    }
    
    const result = await executeEnrichmentTasks(tasks, batchSize);
    return res.json(result);
  } catch (error) {
    console.error(`Error executing enrichment tasks: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Run the entire intelligent enrichment workflow
router.post('/run-enrichment-workflow', async (req, res) => {
  try {
    const { batchSize = 3 } = req.body;
    const result = await runIntelligentEnrichmentWorkflow(batchSize);
    return res.json(result);
  } catch (error) {
    console.error(`Error running enrichment workflow: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Get enrichment performance metrics
router.get('/enrichment-performance', async (req, res) => {
  try {
    const performance = await analyzeEnrichmentPerformance();
    return res.json(performance);
  } catch (error) {
    console.error(`Error analyzing enrichment performance: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Create or update the free_zone_analysis table if needed
router.post('/setup-analysis-table', async (req, res) => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS free_zone_analysis (
        id SERIAL PRIMARY KEY,
        free_zone_id INTEGER NOT NULL,
        overall_completeness NUMERIC,
        fields JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    return res.json({ message: 'Analysis table setup complete' });
  } catch (error) {
    console.error(`Error setting up analysis table: ${error}`);
    return res.status(500).json({ error: (error as Error).message });
  }
});

// Register all AI Product Manager routes to the main Express application
export function registerAIProductManagerRoutes(app: express.Express) {
  app.use('/api/ai-pm', router);
  
  // Set up the analysis table for historical tracking
  router.post('/setup-analysis-table', async (req, res) => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS free_zone_analysis (
          id SERIAL PRIMARY KEY,
          free_zone_id INTEGER NOT NULL,
          overall_completeness NUMERIC,
          fields JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      return res.json({ message: 'Analysis table setup complete' });
    } catch (error) {
      console.error(`Error setting up analysis table: ${error}`);
      return res.status(500).json({ error: (error as Error).message });
    }
  });
  
  // Set up the analysis table during registration
  setImmediate(async () => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS free_zone_analysis (
          id SERIAL PRIMARY KEY,
          free_zone_id INTEGER NOT NULL,
          overall_completeness NUMERIC,
          fields JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('[AI-PM] Analysis table setup complete');
    } catch (error) {
      console.error(`[AI-PM] Error setting up analysis table: ${error}`);
    }
  });
}

export default router;