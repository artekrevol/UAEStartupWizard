import { Request, Response } from 'express';
import { scrapeFreeZones, scrapeEstablishmentGuides, scrapeFreeZoneWebsite } from '../utils/scraper';
import { validateSchedule } from '../utils/validator';
import { eventBus } from '../../../shared/event-bus';

const scraperJobs: {
  [key: string]: {
    id: string;
    type: string;
    schedule: string;
    lastRun: string | null;
    status: 'scheduled' | 'running' | 'completed' | 'failed';
    error?: string;
  }
} = {};

/**
 * GET /api/scraper/status
 * Get the status of all scraper jobs and last run information
 */
export const getStatus = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      status: 'success',
      data: {
        activeJobs: Object.values(scraperJobs),
        isRunning: Object.values(scraperJobs).some(job => job.status === 'running')
      }
    });
  } catch (error) {
    console.error('[Scraper Controller] Error getting status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get scraper status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * POST /api/scraper/free-zones
 * Manually trigger scraping of free zones
 */
export const runFreeZonesScraping = async (req: Request, res: Response) => {
  try {
    const jobId = `freezone-${Date.now()}`;
    
    // Update job status
    scraperJobs[jobId] = {
      id: jobId,
      type: 'free-zones',
      schedule: 'manual',
      lastRun: new Date().toISOString(),
      status: 'running'
    };
    
    // Publish event
    eventBus.publish('scraper-job-started', {
      id: jobId,
      type: 'free-zones',
      timestamp: new Date().toISOString(),
      trigger: 'manual'
    });
    
    // Send initial response
    res.status(202).json({
      status: 'success',
      message: 'Free zones scraping started',
      data: {
        jobId
      }
    });
    
    // Run the scraping job
    try {
      const result = await scrapeFreeZones();
      
      // Update job status
      scraperJobs[jobId] = {
        ...scraperJobs[jobId],
        status: 'completed'
      };
      
      // Publish completion event
      eventBus.publish('scraper-job-completed', {
        id: jobId,
        type: 'free-zones',
        timestamp: new Date().toISOString(),
        status: 'success',
        result
      });
    } catch (error) {
      // Update job status
      scraperJobs[jobId] = {
        ...scraperJobs[jobId],
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
      
      // Publish error event
      eventBus.publish('scraper-job-error', {
        id: jobId,
        type: 'free-zones',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.error(`[Scraper Controller] Free zones scraping failed: ${error}`);
    }
  } catch (error) {
    console.error('[Scraper Controller] Error starting free zones scraping:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to start free zones scraping',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * POST /api/scraper/establishment-guides
 * Manually trigger scraping of establishment guides
 */
export const runEstablishmentGuidesScraping = async (req: Request, res: Response) => {
  try {
    const jobId = `guides-${Date.now()}`;
    
    // Update job status
    scraperJobs[jobId] = {
      id: jobId,
      type: 'establishment-guides',
      schedule: 'manual',
      lastRun: new Date().toISOString(),
      status: 'running'
    };
    
    // Publish event
    eventBus.publish('scraper-job-started', {
      id: jobId,
      type: 'establishment-guides',
      timestamp: new Date().toISOString(),
      trigger: 'manual'
    });
    
    // Send initial response
    res.status(202).json({
      status: 'success',
      message: 'Establishment guides scraping started',
      data: {
        jobId
      }
    });
    
    // Run the scraping job
    try {
      const result = await scrapeEstablishmentGuides();
      
      // Update job status
      scraperJobs[jobId] = {
        ...scraperJobs[jobId],
        status: 'completed'
      };
      
      // Publish completion event
      eventBus.publish('scraper-job-completed', {
        id: jobId,
        type: 'establishment-guides',
        timestamp: new Date().toISOString(),
        status: 'success',
        result
      });
    } catch (error) {
      // Update job status
      scraperJobs[jobId] = {
        ...scraperJobs[jobId],
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
      
      // Publish error event
      eventBus.publish('scraper-job-error', {
        id: jobId,
        type: 'establishment-guides',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.error(`[Scraper Controller] Establishment guides scraping failed: ${error}`);
    }
  } catch (error) {
    console.error('[Scraper Controller] Error starting establishment guides scraping:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to start establishment guides scraping',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * POST /api/scraper/free-zone-website
 * Scrape a specific free zone website
 */
export const runFreeZoneWebsiteScraping = async (req: Request, res: Response) => {
  try {
    const { url, freeZoneId } = req.body;
    
    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'URL is required'
      });
    }
    
    const jobId = `website-${Date.now()}`;
    
    // Update job status
    scraperJobs[jobId] = {
      id: jobId,
      type: 'free-zone-website',
      schedule: 'manual',
      lastRun: new Date().toISOString(),
      status: 'running'
    };
    
    // Publish event
    eventBus.publish('scraper-job-started', {
      id: jobId,
      type: 'free-zone-website',
      timestamp: new Date().toISOString(),
      trigger: 'manual',
      url,
      freeZoneId
    });
    
    // Send initial response
    res.status(202).json({
      status: 'success',
      message: `Website scraping started for ${url}`,
      data: {
        jobId
      }
    });
    
    // Run the scraping job
    try {
      const result = await scrapeFreeZoneWebsite(url, freeZoneId);
      
      // Update job status
      scraperJobs[jobId] = {
        ...scraperJobs[jobId],
        status: 'completed'
      };
      
      // Publish completion event
      eventBus.publish('scraper-job-completed', {
        id: jobId,
        type: 'free-zone-website',
        timestamp: new Date().toISOString(),
        status: 'success',
        url,
        freeZoneId,
        result
      });
    } catch (error) {
      // Update job status
      scraperJobs[jobId] = {
        ...scraperJobs[jobId],
        status: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
      
      // Publish error event
      eventBus.publish('scraper-job-error', {
        id: jobId,
        type: 'free-zone-website',
        timestamp: new Date().toISOString(),
        url,
        freeZoneId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.error(`[Scraper Controller] Website scraping failed for ${url}: ${error}`);
    }
  } catch (error) {
    console.error('[Scraper Controller] Error starting website scraping:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to start website scraping',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * POST /api/scraper/schedule
 * Schedule a scraping job to run at a specific cron interval
 */
export const scheduleScrapingJob = async (req: Request, res: Response) => {
  try {
    const { schedule, type } = req.body;
    
    if (!schedule || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Schedule and type are required'
      });
    }
    
    // Validate schedule
    if (!validateSchedule(schedule)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid cron schedule format'
      });
    }
    
    // Validate type
    if (!['free-zones', 'establishment-guides', 'all'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid type, must be one of: free-zones, establishment-guides, all'
      });
    }
    
    const jobId = `scheduled-${type}-${Date.now()}`;
    
    // Update job status
    scraperJobs[jobId] = {
      id: jobId,
      type,
      schedule,
      lastRun: null,
      status: 'scheduled'
    };
    
    // Publish event to schedule the job
    eventBus.publish('schedule-scraping-job', {
      id: jobId,
      type,
      schedule,
      timestamp: new Date().toISOString()
    });
    
    return res.status(200).json({
      status: 'success',
      message: `Successfully scheduled ${type} scraping with pattern: ${schedule}`,
      data: {
        jobId,
        type,
        schedule
      }
    });
  } catch (error) {
    console.error('[Scraper Controller] Error scheduling scraping job:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to schedule scraping job',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export default {
  getStatus,
  runFreeZonesScraping,
  runEstablishmentGuidesScraping,
  runFreeZoneWebsiteScraping,
  scheduleScrapingJob
};