import express from 'express';
import scraperController from '../controllers/scraperController';

const router = express.Router();

/**
 * @route   GET /api/scraper/status
 * @desc    Get status of scraper jobs
 * @access  Private
 */
router.get('/status', scraperController.getStatus);

/**
 * @route   POST /api/scraper/free-zones
 * @desc    Scrape free zones
 * @access  Private/Admin
 */
router.post('/free-zones', scraperController.runFreeZonesScraping);

/**
 * @route   POST /api/scraper/establishment-guides
 * @desc    Scrape establishment guides
 * @access  Private/Admin
 */
router.post('/establishment-guides', scraperController.runEstablishmentGuidesScraping);

/**
 * @route   POST /api/scraper/free-zone-website
 * @desc    Scrape a specific free zone website
 * @access  Private/Admin
 */
router.post('/free-zone-website', scraperController.runFreeZoneWebsiteScraping);

/**
 * @route   POST /api/scraper/schedule
 * @desc    Schedule a scraping job
 * @access  Private/Admin
 */
router.post('/schedule', scraperController.scheduleScrapingJob);

export default router;