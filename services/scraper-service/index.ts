/**
 * Scraper Service - Handles web scraping operations for freezone data
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import nodeCron from 'node-cron';
import { errorHandlerMiddleware, ServiceException, ErrorCode } from '../../shared/errors';
import { createEventBus, EventType, createEvent } from '../../shared/event-bus';
import { ScraperTaskStatus, ScraperTaskType } from '../../shared/types';

const app = express();
const PORT = process.env.PORT || 3005;

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const db = drizzle(pool);

// Initialize event bus
const eventBus = createEventBus();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Scraper task scheduler
class ScraperScheduler {
  private static instance: ScraperScheduler;
  private activeJobs: Map<string, nodeCron.ScheduledTask> = new Map();
  
  private constructor() {
    // Initialize scheduler
    console.log('[Scraper Service] Initializing scheduler');
    
    // Schedule daily maintenance job
    this.scheduleMaintenanceJob();
  }
  
  public static getInstance(): ScraperScheduler {
    if (!ScraperScheduler.instance) {
      ScraperScheduler.instance = new ScraperScheduler();
    }
    return ScraperScheduler.instance;
  }
  
  public scheduleTask(taskId: string, cronExpression: string, callback: () => Promise<void>): void {
    // Cancel existing job if it exists
    if (this.activeJobs.has(taskId)) {
      this.cancelTask(taskId);
    }
    
    // Schedule new job
    const job = nodeCron.schedule(cronExpression, async () => {
      try {
        await callback();
      } catch (error) {
        console.error(`[Scraper Service] Error in scheduled task ${taskId}:`, error);
      }
    });
    
    this.activeJobs.set(taskId, job);
    console.log(`[Scraper Service] Scheduled task ${taskId} with cron: ${cronExpression}`);
  }
  
  public cancelTask(taskId: string): void {
    const job = this.activeJobs.get(taskId);
    if (job) {
      job.stop();
      this.activeJobs.delete(taskId);
      console.log(`[Scraper Service] Cancelled task ${taskId}`);
    }
  }
  
  private scheduleMaintenanceJob(): void {
    // Run daily at midnight
    this.scheduleTask('maintenance', '0 0 * * *', async () => {
      console.log('[Scraper Service] Running maintenance job');
      
      // In production, cleanup completed/failed tasks older than X days
      // await db.delete(scraperTasks)
      //   .where(and(
      //     or(eq(scraperTasks.status, ScraperTaskStatus.COMPLETED), eq(scraperTasks.status, ScraperTaskStatus.FAILED)),
      //     lt(scraperTasks.completedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // 30 days
      //   ));
      
      // Reschedule tasks that failed but should be retried
      // const tasksToRetry = await db.select().from(scraperTasks)
      //   .where(eq(scraperTasks.status, ScraperTaskStatus.RETRY));
      // 
      // for (const task of tasksToRetry) {
      //   await db.update(scraperTasks)
      //     .set({ status: ScraperTaskStatus.PENDING })
      //     .where(eq(scraperTasks.id, task.id));
      // }
      
      console.log('[Scraper Service] Maintenance job completed');
    });
  }
  
  public scheduleFreeZoneUpdate(freeZoneId: number, cronExpression: string = '0 0 * * *'): void {
    const taskId = `freezone-update-${freeZoneId}`;
    
    this.scheduleTask(taskId, cronExpression, async () => {
      console.log(`[Scraper Service] Running scheduled update for free zone ${freeZoneId}`);
      
      try {
        // Create a new scraper task
        const task = {
          id: Math.floor(Math.random() * 1000),
          url: `https://example.com/freezones/${freeZoneId}`,
          type: ScraperTaskType.FREEZONE_INFO,
          status: ScraperTaskStatus.PENDING,
          priority: 1,
          freeZoneId,
          createdAt: new Date()
        };
        
        // In production, save to database
        // await db.insert(scraperTasks).values(task);
        
        // Process the task immediately
        await this.processTask(task);
      } catch (error) {
        console.error(`[Scraper Service] Error scheduling free zone update for ${freeZoneId}:`, error);
      }
    });
  }
  
  private async processTask(task: any): Promise<void> {
    try {
      // Update task status
      task.status = ScraperTaskStatus.IN_PROGRESS;
      task.startedAt = new Date();
      
      // In production, update in database
      // await db.update(scraperTasks)
      //   .set({ status: ScraperTaskStatus.IN_PROGRESS, startedAt: task.startedAt })
      //   .where(eq(scraperTasks.id, task.id));
      
      console.log(`[Scraper Service] Processing task ${task.id} for ${task.url}`);
      
      // Perform scraping based on task type
      let results;
      switch (task.type) {
        case ScraperTaskType.FREEZONE_INFO:
          results = await this.scrapeFreeZoneInfo(task.url, task.freeZoneId);
          break;
        case ScraperTaskType.DOCUMENT_DOWNLOAD:
          results = await this.scrapeDocuments(task.url, task.freeZoneId);
          break;
        case ScraperTaskType.BUSINESS_ACTIVITY:
          results = await this.scrapeBusinessActivities(task.url);
          break;
        default:
          results = await this.scrapeGeneral(task.url);
      }
      
      // Mark task as completed
      task.status = ScraperTaskStatus.COMPLETED;
      task.completedAt = new Date();
      task.results = results;
      
      // In production, update in database
      // await db.update(scraperTasks)
      //   .set({ 
      //     status: ScraperTaskStatus.COMPLETED, 
      //     completedAt: task.completedAt,
      //     results: task.results
      //   })
      //   .where(eq(scraperTasks.id, task.id));
      
      // Publish task completed event
      await eventBus.publish(createEvent(EventType.SCRAPER_TASK_COMPLETED, {
        id: task.id,
        type: task.type,
        freeZoneId: task.freeZoneId,
        results
      }));
      
      console.log(`[Scraper Service] Task ${task.id} completed successfully`);
    } catch (error) {
      console.error(`[Scraper Service] Error processing task ${task.id}:`, error);
      
      // Mark task as failed
      task.status = ScraperTaskStatus.FAILED;
      task.completedAt = new Date();
      task.error = error instanceof Error ? error.message : 'Unknown error';
      
      // In production, update in database
      // await db.update(scraperTasks)
      //   .set({ 
      //     status: ScraperTaskStatus.FAILED, 
      //     completedAt: task.completedAt,
      //     error: task.error
      //   })
      //   .where(eq(scraperTasks.id, task.id));
      
      // Publish task failed event
      await eventBus.publish(createEvent(EventType.SCRAPER_TASK_FAILED, {
        id: task.id,
        type: task.type,
        freeZoneId: task.freeZoneId,
        error: task.error
      }));
    }
  }
  
  // Scraper implementations
  private async scrapeFreeZoneInfo(url: string, freeZoneId: number): Promise<any> {
    // In production, use Playwright or similar to scrape data
    // For demo, return mock data
    console.log(`[Scraper Service] Scraping free zone info from ${url}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      updatedAt: new Date(),
      basicInfo: {
        name: `Free Zone ${freeZoneId}`,
        location: 'Dubai',
        website: url,
        phone: '+971-4-123-4567'
      },
      setupCosts: {
        license: Math.floor(10000 + Math.random() * 20000),
        registration: Math.floor(5000 + Math.random() * 10000),
        visa: Math.floor(3000 + Math.random() * 7000)
      },
      industries: ['Technology', 'Finance', 'Logistics', 'Media']
    };
  }
  
  private async scrapeDocuments(url: string, freeZoneId: number): Promise<any> {
    console.log(`[Scraper Service] Scraping documents from ${url}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 700));
    
    return {
      updatedAt: new Date(),
      documents: [
        {
          title: 'Business Setup Guide',
          url: `${url}/documents/setup-guide.pdf`,
          type: 'pdf',
          category: 'business_setup'
        },
        {
          title: 'Visa Requirements',
          url: `${url}/documents/visa-requirements.pdf`,
          type: 'pdf',
          category: 'visa'
        },
        {
          title: 'Fee Schedule',
          url: `${url}/documents/fees.pdf`,
          type: 'pdf',
          category: 'financial'
        }
      ]
    };
  }
  
  private async scrapeBusinessActivities(url: string): Promise<any> {
    console.log(`[Scraper Service] Scraping business activities from ${url}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      updatedAt: new Date(),
      activities: [
        {
          name: 'Software Development',
          code: 'IT-001',
          category: 'Technology'
        },
        {
          name: 'Financial Advisory',
          code: 'FIN-001',
          category: 'Finance'
        },
        {
          name: 'E-commerce',
          code: 'COM-001',
          category: 'Commerce'
        }
      ]
    };
  }
  
  private async scrapeGeneral(url: string): Promise<any> {
    console.log(`[Scraper Service] Performing general scrape of ${url}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      updatedAt: new Date(),
      title: 'Page Title',
      description: 'Meta description',
      content: 'Main content extracted from the page...',
      links: [
        { text: 'About Us', url: `${url}/about` },
        { text: 'Services', url: `${url}/services` },
        { text: 'Contact', url: `${url}/contact` }
      ]
    };
  }
}

// Initialize the scheduler
const scheduler = ScraperScheduler.getInstance();

// Define routes

// Create a new scraper task
app.post('/tasks', async (req, res, next) => {
  try {
    const { url, type, freeZoneId, priority = 1 } = req.body;
    
    // Validate input
    if (!url || typeof url !== 'string') {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'URL is required and must be a string'
      );
    }
    
    if (!type || !Object.values(ScraperTaskType).includes(type as ScraperTaskType)) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        `Type must be one of: ${Object.values(ScraperTaskType).join(', ')}`
      );
    }
    
    // Create new task
    const task = {
      id: Math.floor(Math.random() * 1000),
      url,
      type,
      status: ScraperTaskStatus.PENDING,
      priority,
      freeZoneId: freeZoneId ? parseInt(freeZoneId) : undefined,
      createdAt: new Date()
    };
    
    // In production, save to database
    // await db.insert(scraperTasks).values(task);
    
    // Process the task asynchronously
    setTimeout(() => {
      scheduler.processTask(task).catch(error => {
        console.error(`[Scraper Service] Error processing task ${task.id}:`, error);
      });
    }, 0);
    
    res.status(202).json({
      id: task.id,
      status: task.status,
      message: 'Task has been queued for processing'
    });
    
  } catch (error) {
    next(error);
  }
});

// Get task status
app.get('/tasks/:id', async (req, res, next) => {
  try {
    const taskId = parseInt(req.params.id);
    
    // In production, fetch from database
    // const task = await db.select().from(scraperTasks).where(eq(scraperTasks.id, taskId)).limit(1);
    
    // Mock task status responses
    const mockTasks = {
      1: {
        id: 1,
        url: 'https://www.dmcc.ae',
        type: ScraperTaskType.FREEZONE_INFO,
        status: ScraperTaskStatus.COMPLETED,
        priority: 1,
        freeZoneId: 1,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        startedAt: new Date(Date.now() - 3590000), // 59 minutes 50 seconds ago
        completedAt: new Date(Date.now() - 3540000), // 59 minutes ago
        results: {
          /* Task results data */
        }
      },
      2: {
        id: 2,
        url: 'https://www.dic.ae',
        type: ScraperTaskType.DOCUMENT_DOWNLOAD,
        status: ScraperTaskStatus.IN_PROGRESS,
        priority: 1,
        freeZoneId: 2,
        createdAt: new Date(Date.now() - 300000), // 5 minutes ago
        startedAt: new Date(Date.now() - 290000) // 4 minutes 50 seconds ago
      },
      3: {
        id: 3,
        url: 'https://www.adgm.com',
        type: ScraperTaskType.BUSINESS_ACTIVITY,
        status: ScraperTaskStatus.FAILED,
        priority: 2,
        freeZoneId: 3,
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        startedAt: new Date(Date.now() - 7190000), // 1 hour 59 minutes 50 seconds ago
        completedAt: new Date(Date.now() - 7140000), // 1 hour 59 minutes ago
        error: 'Connection timeout while scraping URL'
      }
    };
    
    if (mockTasks[taskId]) {
      res.json(mockTasks[taskId]);
    } else {
      throw new ServiceException(
        ErrorCode.NOT_FOUND,
        `Task with ID ${taskId} not found`
      );
    }
    
  } catch (error) {
    next(error);
  }
});

// Get all tasks with optional filters
app.get('/tasks', async (req, res, next) => {
  try {
    const { status, type, freeZoneId } = req.query;
    
    // In production, fetch from database with filters
    // let query = db.select().from(scraperTasks);
    // if (status) query = query.where(eq(scraperTasks.status, status));
    // if (type) query = query.where(eq(scraperTasks.type, type));
    // if (freeZoneId) query = query.where(eq(scraperTasks.freeZoneId, parseInt(freeZoneId)));
    // const tasks = await query;
    
    // Mock tasks list
    const mockTasks = [
      {
        id: 1,
        url: 'https://www.dmcc.ae',
        type: ScraperTaskType.FREEZONE_INFO,
        status: ScraperTaskStatus.COMPLETED,
        priority: 1,
        freeZoneId: 1,
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        id: 2,
        url: 'https://www.dic.ae',
        type: ScraperTaskType.DOCUMENT_DOWNLOAD,
        status: ScraperTaskStatus.IN_PROGRESS,
        priority: 1,
        freeZoneId: 2,
        createdAt: new Date(Date.now() - 300000) // 5 minutes ago
      },
      {
        id: 3,
        url: 'https://www.adgm.com',
        type: ScraperTaskType.BUSINESS_ACTIVITY,
        status: ScraperTaskStatus.FAILED,
        priority: 2,
        freeZoneId: 3,
        createdAt: new Date(Date.now() - 7200000) // 2 hours ago
      }
    ];
    
    // Apply filters if provided
    let filteredTasks = [...mockTasks];
    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    if (type) {
      filteredTasks = filteredTasks.filter(task => task.type === type);
    }
    if (freeZoneId) {
      filteredTasks = filteredTasks.filter(task => task.freeZoneId === parseInt(freeZoneId as string));
    }
    
    res.json(filteredTasks);
    
  } catch (error) {
    next(error);
  }
});

// Schedule recurring task
app.post('/schedule', async (req, res, next) => {
  try {
    const { freeZoneId, cronExpression } = req.body;
    
    if (!freeZoneId) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Free zone ID is required'
      );
    }
    
    // Schedule the task
    scheduler.scheduleFreeZoneUpdate(
      parseInt(freeZoneId),
      cronExpression || '0 0 * * *' // Default: daily at midnight
    );
    
    res.json({
      success: true,
      message: `Successfully scheduled update for free zone ${freeZoneId}`,
      freeZoneId,
      cronExpression: cronExpression || '0 0 * * *'
    });
    
  } catch (error) {
    next(error);
  }
});

// Cancel scheduled task
app.delete('/schedule/:freeZoneId', async (req, res, next) => {
  try {
    const freeZoneId = parseInt(req.params.freeZoneId);
    
    // Cancel the scheduled task
    scheduler.cancelTask(`freezone-update-${freeZoneId}`);
    
    res.json({
      success: true,
      message: `Successfully cancelled scheduled update for free zone ${freeZoneId}`,
      freeZoneId
    });
    
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use(errorHandlerMiddleware);

// Start server
app.listen(PORT, () => {
  console.log(`[Scraper Service] Server running on port ${PORT}`);
});
