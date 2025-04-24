/**
 * AI Product Manager Routes
 * 
 * This module exposes the AI Product Manager functionality through API endpoints.
 */

import { Express, Request, Response } from 'express';
import { 
  analyzeFreeZoneData, 
  analyzeAllFreeZones, 
  enrichFreeZoneData,
  runScraperForFreeZone,
  getProductRecommendations,
  runProductManagerCycle
} from './index';
import { searchWeb, scrapeUrl, searchAndScrape } from './search-service';
import { getRecentLogs, clearLogs } from './logger';
import { requireAdmin } from '../auth';

/**
 * Register all AI Product Manager routes
 */
export function registerAIProductManagerRoutes(app: Express): void {
  // Analysis endpoints
  app.get("/api/ai-pm/analyze/:freeZoneId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const freeZoneId = parseInt(req.params.freeZoneId);
      const result = await analyzeFreeZoneData(freeZoneId);
      res.json(result);
    } catch (error: unknown) {
      console.error(`Error analyzing free zone: ${error}`);
      res.status(500).json({ 
        error: 'Failed to analyze free zone', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/ai-pm/analyze-all", requireAdmin, async (req: Request, res: Response) => {
    try {
      const results = await analyzeAllFreeZones();
      res.json(results);
    } catch (error: unknown) {
      console.error(`Error analyzing all free zones: ${error}`);
      res.status(500).json({ 
        error: 'Failed to analyze all free zones', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Enrichment endpoints
  app.post("/api/ai-pm/enrich", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { freeZoneId, field } = req.body;
      
      if (!freeZoneId || !field) {
        return res.status(400).json({ 
          error: 'Missing required parameters', 
          message: 'Both freeZoneId and field are required'
        });
      }
      
      const result = await enrichFreeZoneData(parseInt(freeZoneId), field);
      res.json(result);
    } catch (error: unknown) {
      console.error(`Error enriching free zone data: ${error}`);
      res.status(500).json({ 
        error: 'Failed to enrich free zone data', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Scraper endpoints
  app.post("/api/ai-pm/scrape", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { freeZoneName, url } = req.body;
      
      if (!freeZoneName || !url) {
        return res.status(400).json({ 
          error: 'Missing required parameters', 
          message: 'Both freeZoneName and url are required'
        });
      }
      
      const result = await runScraperForFreeZone(freeZoneName, url);
      res.json(result);
    } catch (error: unknown) {
      console.error(`Error running scraper: ${error}`);
      res.status(500).json({ 
        error: 'Failed to run scraper', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Web search endpoints
  app.post("/api/ai-pm/search", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ 
          error: 'Missing required parameter', 
          message: 'Query is required'
        });
      }
      
      const result = await searchWeb(query);
      res.json(result);
    } catch (error: unknown) {
      console.error(`Error searching web: ${error}`);
      res.status(500).json({ 
        error: 'Failed to search web', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/ai-pm/scrape-url", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ 
          error: 'Missing required parameter', 
          message: 'URL is required'
        });
      }
      
      const result = await scrapeUrl(url);
      res.json(result);
    } catch (error: unknown) {
      console.error(`Error scraping URL: ${error}`);
      res.status(500).json({ 
        error: 'Failed to scrape URL', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/ai-pm/search-and-scrape", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ 
          error: 'Missing required parameter', 
          message: 'Query is required'
        });
      }
      
      const result = await searchAndScrape(query);
      res.json(result);
    } catch (error: unknown) {
      console.error(`Error in search and scrape: ${error}`);
      res.status(500).json({ 
        error: 'Failed to search and scrape', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Recommendation endpoints
  app.get("/api/ai-pm/recommendations", requireAdmin, async (req: Request, res: Response) => {
    try {
      const recommendations = await getProductRecommendations();
      res.json({ recommendations });
    } catch (error: unknown) {
      console.error(`Error getting recommendations: ${error}`);
      res.status(500).json({ 
        error: 'Failed to get recommendations', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Full cycle endpoints
  app.post("/api/ai-pm/run-cycle", requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = await runProductManagerCycle();
      res.json(result);
    } catch (error: unknown) {
      console.error(`Error running product manager cycle: ${error}`);
      res.status(500).json({ 
        error: 'Failed to run product manager cycle', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Logging endpoints
  app.get("/api/ai-pm/logs", requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await getRecentLogs(limit);
      res.json({ logs });
    } catch (error: unknown) {
      console.error(`Error getting logs: ${error}`);
      res.status(500).json({ 
        error: 'Failed to get logs', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.delete("/api/ai-pm/logs", requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = await clearLogs();
      res.json(result);
    } catch (error: unknown) {
      console.error(`Error clearing logs: ${error}`);
      res.status(500).json({ 
        error: 'Failed to clear logs', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
}