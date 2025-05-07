import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json, urlencoded } from 'body-parser';
import cron from 'node-cron';
import { initCommunication, MessagePriority } from '../../shared/communication/service-communicator';
import scraperRoutes from './routes/scraperRoutes';
import { scrapeFreeZones, scrapeEstablishmentGuides, scrapeFreeZoneWebsite } from './utils/scraper-with-communication';

// Initialize Express app
const app = express();
const PORT = process.env.SCRAPER_SERVICE_PORT || 3004;
const SERVICE_NAME = 'scraper-service';

// Initialize communication system
const communicator = initCommunication(SERVICE_NAME);

// Middleware
app.use(helmet());
app.use(cors());
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: SERVICE_NAME,
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
      // Broadcast job started event
      communicator.broadcast('scraper.job.started', {
        type: 'monthly-update',
        timestamp: new Date().toISOString()
      });
      
      // Run scraping jobs
      await scrapeFreeZones();
      await scrapeEstablishmentGuides();
      
      console.log('[Scraper Service] Completed monthly data update');
      
      // Broadcast job completed event
      communicator.broadcast('scraper.job.completed', {
        type: 'monthly-update',
        timestamp: new Date().toISOString(),
        status: 'success'
      }, { priority: MessagePriority.HIGH });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Scraper Service] Error during monthly update: ${errorMessage}`);
      
      // Broadcast error event
      communicator.broadcast('scraper.job.error', {
        type: 'monthly-update',
        timestamp: new Date().toISOString(),
        error: errorMessage
      }, { priority: MessagePriority.HIGH });
    }
  });
  
  // Set up event handlers for job scheduling
  setupJobSchedulingHandlers();
};

// Set up job scheduling handlers
const setupJobSchedulingHandlers = () => {
  // Listen for job scheduling requests
  communicator.onMessage('scraper.schedule.job', async (data) => {
    console.log(`[Scraper Service] Received job scheduling request:`, data);
    
    try {
      const { schedule, type, requestId, replyTo } = data;
      
      // Validate schedule format
      if (!cron.validate(schedule)) {
        console.error(`[Scraper Service] Invalid cron schedule: ${schedule}`);
        
        // Send error response if this was a request
        if (requestId && replyTo) {
          communicator.respond(data, null, `Invalid cron schedule: ${schedule}`);
        }
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
          
          // Broadcast completion event
          communicator.broadcast('scraper.job.completed', {
            type: `scheduled-${type}`,
            schedule,
            timestamp: new Date().toISOString(),
            status: 'success'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[Scraper Service] Error during scheduled job: ${errorMessage}`);
          
          // Broadcast error event
          communicator.broadcast('scraper.job.error', {
            type: `scheduled-${type}`,
            schedule,
            timestamp: new Date().toISOString(),
            error: errorMessage
          }, { priority: MessagePriority.HIGH });
        }
      });
      
      console.log(`[Scraper Service] Successfully scheduled job with pattern: ${schedule} for type: ${type}`);
      
      // Broadcast job scheduled event
      communicator.broadcast('scraper.job.scheduled', {
        type,
        schedule,
        timestamp: new Date().toISOString()
      });
      
      // Send success response if this was a request
      if (requestId && replyTo) {
        communicator.respond(data, {
          success: true,
          type,
          schedule,
          message: `Successfully scheduled ${type} job with pattern: ${schedule}`
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Scraper Service] Error scheduling job: ${errorMessage}`);
      
      // Send error response if this was a request
      if (data.requestId && data.replyTo) {
        communicator.respond(data, null, errorMessage);
      }
    }
  });
};

// Set up event handlers for service registration
const setupServiceRegistration = () => {
  // Set up handler for API Gateway-related messages
  communicator.onMessage('api-gateway.ready', () => {
    console.log('[Scraper Service] API Gateway is ready, registering service');
    
    // Register with API Gateway
    communicator.sendToService('api-gateway', 'service.register', {
      name: SERVICE_NAME,
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
    }, { priority: MessagePriority.HIGH });
  });
  
  // Handle health check requests
  communicator.onMessage('service.health.check', (data, message) => {
    console.log('[Scraper Service] Received health check request');
    
    // If request came from API Gateway, respond directly
    if (message.source === 'api-gateway' && data.requestId) {
      communicator.respond(data, {
        service: SERVICE_NAME,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } 
    // Otherwise, broadcast health status
    else {
      communicator.broadcast('service.health.status', {
        service: SERVICE_NAME,
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Request handlers for scraper operations
  communicator.onMessage('scraper.run.free-zones', async (data) => {
    console.log('[Scraper Service] Received request to scrape free zones');
    
    try {
      const result = await scrapeFreeZones();
      communicator.respond(data, { success: true, result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      communicator.respond(data, null, errorMessage);
    }
  });
  
  communicator.onMessage('scraper.run.establishment-guides', async (data) => {
    console.log('[Scraper Service] Received request to scrape establishment guides');
    
    try {
      const result = await scrapeEstablishmentGuides();
      communicator.respond(data, { success: true, result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      communicator.respond(data, null, errorMessage);
    }
  });
};

// Start the server
const startServer = async () => {
  try {
    // Set up service registration
    setupServiceRegistration();
    
    // Initialize scheduled jobs
    initializeScheduledJobs();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`[Scraper Service] Server running on port ${PORT}`);
      
      // Announce service is ready
      communicator.broadcast('service.ready', {
        name: SERVICE_NAME,
        timestamp: new Date().toISOString()
      }, { priority: MessagePriority.HIGH });
      
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
  
  // Broadcast service shutdown
  communicator.broadcast('service.shutdown', {
    name: SERVICE_NAME,
    timestamp: new Date().toISOString()
  }, { priority: MessagePriority.CRITICAL });
  
  // Disconnect from message bus
  communicator.disconnect();
  
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Scraper Service] SIGINT received, shutting down gracefully');
  
  // Broadcast service shutdown
  communicator.broadcast('service.shutdown', {
    name: SERVICE_NAME,
    timestamp: new Date().toISOString()
  }, { priority: MessagePriority.CRITICAL });
  
  // Disconnect from message bus
  communicator.disconnect();
  
  process.exit(0);
});

// Start the server
startServer();

export { app };