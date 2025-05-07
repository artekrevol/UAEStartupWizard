import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import cron from 'node-cron';
import { eventBus } from '../../shared/event-bus';
import scraperRoutes from './routes/scraperRoutes';
import { scrapeFreeZones, scrapeEstablishmentGuides } from './utils/scraper';

// Initialize Express app
const app = express();
const PORT = process.env.SCRAPER_SERVICE_PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'scraper-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/scraper', scraperRoutes);

// Initialize scheduled scraping jobs
const initializeScheduledJobs = () => {
  // Schedule monthly scraping of free zones and establishment guides
  // Run at midnight on the 1st of each month
  cron.schedule('0 0 1 * *', async () => {
    console.log('[Scraper Service] Starting monthly data update');
    
    try {
      // Publish event before starting
      eventBus.publish('scraper-job-started', {
        type: 'monthly-update',
        timestamp: new Date().toISOString()
      });
      
      // Run scraping jobs
      await scrapeFreeZones();
      await scrapeEstablishmentGuides();
      
      console.log('[Scraper Service] Completed monthly data update');
      
      // Publish event after completion
      eventBus.publish('scraper-job-completed', {
        type: 'monthly-update',
        timestamp: new Date().toISOString(),
        status: 'success'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Scraper Service] Error during monthly update: ${errorMessage}`);
      
      // Publish event for error
      eventBus.publish('scraper-job-error', {
        type: 'monthly-update',
        timestamp: new Date().toISOString(),
        error: errorMessage
      });
    }
  });
  
  // Listen for dynamic job scheduling events
  eventBus.subscribe('schedule-scraping-job', async (data) => {
    console.log(`[Scraper Service] Received job scheduling request: ${JSON.stringify(data)}`);
    
    try {
      const { schedule, type } = data;
      
      // Validate schedule format
      if (!cron.validate(schedule)) {
        console.error(`[Scraper Service] Invalid cron schedule: ${schedule}`);
        return;
      }
      
      // Schedule the job
      cron.schedule(schedule, async () => {
        console.log(`[Scraper Service] Running scheduled job type: ${type}`);
        
        try {
          // Run appropriate scraping based on type
          if (type === 'free-zones' || type === 'all') {
            await scrapeFreeZones();
          }
          
          if (type === 'establishment-guides' || type === 'all') {
            await scrapeEstablishmentGuides();
          }
          
          console.log(`[Scraper Service] Completed scheduled job type: ${type}`);
          
          // Publish event after completion
          eventBus.publish('scraper-job-completed', {
            type: `scheduled-${type}`,
            schedule,
            timestamp: new Date().toISOString(),
            status: 'success'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[Scraper Service] Error during scheduled job: ${errorMessage}`);
          
          // Publish event for error
          eventBus.publish('scraper-job-error', {
            type: `scheduled-${type}`,
            schedule,
            timestamp: new Date().toISOString(),
            error: errorMessage
          });
        }
      });
      
      console.log(`[Scraper Service] Successfully scheduled job with pattern: ${schedule} for type: ${type}`);
      
      // Publish confirmation event
      eventBus.publish('scraper-job-scheduled', {
        type,
        schedule,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Scraper Service] Error scheduling job: ${errorMessage}`);
    }
  });
};

// Set up event handlers for service registration
const setupEventHandlers = () => {
  // Register service with API Gateway when it's ready
  eventBus.subscribe('api-gateway-ready', () => {
    console.log('[Scraper Service] API Gateway is ready, registering service');
    
    // Register with API Gateway
    eventBus.publish('service-registered', {
      name: 'scraper-service',
      host: process.env.SCRAPER_SERVICE_HOST || 'localhost',
      port: Number(PORT),
      healthEndpoint: '/health',
      routes: [
        { path: '/api/scraper/free-zones', methods: ['POST'] },
        { path: '/api/scraper/establishment-guides', methods: ['POST'] },
        { path: '/api/scraper/free-zone-website', methods: ['POST'] },
        { path: '/api/scraper/schedule', methods: ['POST'] },
        { path: '/api/scraper/status', methods: ['GET'] }
      ]
    });
  });
  
  // Handle service health check requests
  eventBus.subscribe('health-check', (data) => {
    if (data.service === 'all' || data.service === 'scraper-service') {
      console.log('[Scraper Service] Received health check request');
      
      // Respond with health status
      eventBus.publish('health-status', {
        service: 'scraper-service',
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Start the server
const startServer = async () => {
  try {
    // Set up event handlers
    setupEventHandlers();
    
    // Initialize scheduled jobs
    initializeScheduledJobs();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`[Scraper Service] Server running on port ${PORT}`);
      
      // Run an initial scrape on startup if needed
      if (process.env.RUN_INITIAL_SCRAPE === 'true') {
        console.log('[Scraper Service] Running initial data scrape');
        
        scrapeFreeZones().catch(error => {
          console.error(`[Scraper Service] Initial free zones scrape error: ${error.message}`);
        });
        
        scrapeEstablishmentGuides().catch(error => {
          console.error(`[Scraper Service] Initial establishment guides scrape error: ${error.message}`);
        });
      }
    });
  } catch (error) {
    console.error('[Scraper Service] Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Scraper Service] SIGTERM received, shutting down gracefully');
  
  // Unregister from API Gateway
  eventBus.publish('service-deregistered', {
    name: 'scraper-service',
    timestamp: new Date().toISOString()
  });
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Scraper Service] SIGINT received, shutting down gracefully');
  
  // Unregister from API Gateway
  eventBus.publish('service-deregistered', {
    name: 'scraper-service',
    timestamp: new Date().toISOString()
  });
  
  process.exit(0);
});

// Start the server
startServer();

export { app };