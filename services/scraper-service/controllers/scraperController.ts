import { Request, Response } from 'express';
import { scrapeFreeZones, scrapeEstablishmentGuides, scrapeFreeZoneWebsite } from '../utils/scraper';
import { eventBus } from '../../../shared/event-bus';

/**
 * Trigger scraping of free zones
 */
export const scrapeFreeZonesController = async (req: Request, res: Response) => {
  try {
    console.log('[ScraperController] Starting free zones scraping');
    const freeZones = await scrapeFreeZones();
    
    return res.status(200).json({
      status: 'success',
      message: 'Free zones scraped successfully',
      data: {
        count: freeZones.length,
        freeZones: freeZones.map(zone => ({
          name: zone.name,
          description: zone.description ? zone.description.substring(0, 100) + '...' : ''
        }))
      }
    });
  } catch (error) {
    console.error('[ScraperController] Error in scrapeFreeZonesController:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to scrape free zones',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Trigger scraping of establishment guides
 */
export const scrapeEstablishmentGuidesController = async (req: Request, res: Response) => {
  try {
    console.log('[ScraperController] Starting establishment guides scraping');
    const guides = await scrapeEstablishmentGuides();
    
    return res.status(200).json({
      status: 'success',
      message: 'Establishment guides scraped successfully',
      data: {
        count: guides.length,
        guides: guides.map(guide => ({
          title: guide.title,
          category: guide.category
        }))
      }
    });
  } catch (error) {
    console.error('[ScraperController] Error in scrapeEstablishmentGuidesController:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to scrape establishment guides',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Trigger scraping of a specific free zone website
 */
export const scrapeFreeZoneWebsiteController = async (req: Request, res: Response) => {
  try {
    const { url, freeZoneId } = req.body;
    
    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'URL is required'
      });
    }
    
    if (!freeZoneId) {
      return res.status(400).json({
        status: 'error',
        message: 'Free zone ID is required'
      });
    }
    
    console.log(`[ScraperController] Starting website scraping for free zone ID ${freeZoneId}: ${url}`);
    const result = await scrapeFreeZoneWebsite(url, freeZoneId);
    
    if (!result.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to scrape free zone website',
        data: null
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Free zone website scraped successfully',
      data: result.data
    });
  } catch (error) {
    console.error('[ScraperController] Error in scrapeFreeZoneWebsiteController:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to scrape free zone website',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Schedule a recurring scraping job
 */
export const scheduleScrapingJobController = async (req: Request, res: Response) => {
  try {
    const { schedule, type } = req.body;
    
    if (!schedule) {
      return res.status(400).json({
        status: 'error',
        message: 'Schedule is required (cron format)'
      });
    }
    
    if (!type || !['free-zones', 'establishment-guides', 'all'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid type is required (free-zones, establishment-guides, or all)'
      });
    }
    
    // Publish event to schedule scraping job
    eventBus.publish('schedule-scraping-job', {
      schedule,
      type,
      requestedBy: req.user?.userId || 'system',
      timestamp: new Date().toISOString()
    });
    
    return res.status(200).json({
      status: 'success',
      message: `Scraping job scheduled with pattern: ${schedule} for type: ${type}`
    });
  } catch (error) {
    console.error('[ScraperController] Error in scheduleScrapingJobController:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to schedule scraping job',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get the status of running scraper jobs
 */
export const getScraperStatusController = async (req: Request, res: Response) => {
  try {
    // For now, we'll just return basic status info
    // In a real implementation, we'd track active jobs in a database
    
    return res.status(200).json({
      status: 'success',
      data: {
        status: 'operational', 
        activeJobs: 0,
        lastRun: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[ScraperController] Error in getScraperStatusController:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to get scraper status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};