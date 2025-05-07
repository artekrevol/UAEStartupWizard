import express from 'express';
import { 
  scrapeFreeZonesController, 
  scrapeEstablishmentGuidesController,
  scrapeFreeZoneWebsiteController,
  scheduleScrapingJobController,
  getScraperStatusController
} from '../controllers/scraperController';

const router = express.Router();

// Scraper routes
router.post('/free-zones', scrapeFreeZonesController);
router.post('/establishment-guides', scrapeEstablishmentGuidesController);
router.post('/free-zone-website', scrapeFreeZoneWebsiteController);
router.post('/schedule', scheduleScrapingJobController);
router.get('/status', getScraperStatusController);

export default router;