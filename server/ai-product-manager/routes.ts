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
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error analyzing free zone data: ${error}`);
      res.status(500).json({ message });
    }
  });
  
  app.get("/api/ai-pm/analyze-all", requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = await analyzeAllFreeZones();
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error analyzing all free zones: ${error}`);
      res.status(500).json({ message });
    }
  });
  
  // Data enrichment endpoints
  app.post("/api/ai-pm/enrich/:freeZoneId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const freeZoneId = parseInt(req.params.freeZoneId);
      const { field } = req.body;
      
      if (!field) {
        res.status(400).json({ message: "Field name is required" });
        return;
      }
      
      const result = await enrichFreeZoneData(freeZoneId, field);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error enriching free zone data: ${error}`);
      res.status(500).json({ message });
    }
  });
  
  // Web scraping endpoints
  app.post("/api/ai-pm/scrape", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { freeZoneName, url } = req.body;
      
      if (!freeZoneName || !url) {
        res.status(400).json({ message: "Free zone name and URL are required" });
        return;
      }
      
      const result = await runScraperForFreeZone(freeZoneName, url);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error running scraper: ${error}`);
      res.status(500).json({ message });
    }
  });
  
  // Product recommendations endpoint
  app.get("/api/ai-pm/recommendations", requireAdmin, async (req: Request, res: Response) => {
    try {
      const recommendations = await getProductRecommendations();
      res.json({ recommendations });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error getting product recommendations: ${error}`);
      res.status(500).json({ message });
    }
  });
  
  // Run complete product manager cycle
  app.post("/api/ai-pm/run-cycle", requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = await runProductManagerCycle();
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error running product manager cycle: ${error}`);
      res.status(500).json({ message });
    }
  });
  
  // Advanced search endpoints
  app.get("/api/ai-pm/search", requireAdmin, async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const numResults = parseInt(req.query.num as string || '5');
      
      if (!query) {
        res.status(400).json({ message: "Search query is required" });
        return;
      }
      
      const result = await searchWeb(query, numResults);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error searching web: ${error}`);
      res.status(500).json({ message });
    }
  });
  
  app.post("/api/ai-pm/scrape-url", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { url, contentType } = req.body;
      
      if (!url) {
        res.status(400).json({ message: "URL is required" });
        return;
      }
      
      const validContentTypes = ['general', 'setup', 'costs'];
      const selectedContentType = validContentTypes.includes(contentType) 
        ? contentType as 'general' | 'setup' | 'costs'
        : 'general';
      
      const result = await scrapeUrl(url, selectedContentType);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error scraping URL: ${error}`);
      res.status(500).json({ message });
    }
  });
  
  app.post("/api/ai-pm/search-and-scrape", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { query, contentType, maxResults } = req.body;
      
      if (!query) {
        res.status(400).json({ message: "Search query is required" });
        return;
      }
      
      const validContentTypes = ['general', 'setup', 'costs'];
      const selectedContentType = validContentTypes.includes(contentType) 
        ? contentType as 'general' | 'setup' | 'costs'
        : 'general';
      
      const numResults = parseInt(maxResults || '3');
      
      const result = await searchAndScrape(query, selectedContentType, numResults);
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error in search and scrape: ${error}`);
      res.status(500).json({ message });
    }
  });
  
  // Log management endpoints
  app.get("/api/ai-pm/logs", requireAdmin, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string || '100');
      const logs = getRecentLogs(limit);
      res.json({ logs });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error getting logs: ${error}`);
      res.status(500).json({ message });
    }
  });
  
  app.post("/api/ai-pm/logs/clear", requireAdmin, async (req: Request, res: Response) => {
    try {
      const success = clearLogs();
      res.json({ success });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error clearing logs: ${error}`);
      res.status(500).json({ message });
    }
  });
}