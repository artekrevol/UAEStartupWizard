import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import * as path from "path";
import * as fs from "fs";
import { WebSocketServer, WebSocket } from 'ws';
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getBusinessRecommendations, generateDocumentRequirements, getUAEBusinessAssistantResponse } from "./openai";
import { chatWithBusinessAssistant, getBusinessSetupFlow, getStepGuidance, chatWithEnhancedBusinessAssistant, initializeSystemKnowledge, getOrCreateConversation } from "./assistantService";
import { performWebResearch, searchDocuments, premiumBusinessAnswer } from "./WebResearchAssistant";
import { findBestStaticResponse, staticResponses } from "./static-responses";
import { BusinessSetup, InsertDocument, InsertSaifZoneForm, InsertIssuesLog } from "../shared/schema";
import { calculateBusinessScore } from "./scoring";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { businessActivityCategories, businessActivities, freeZones, documents, issuesLog } from "../shared/schema";
import { documentUpload, processUploadedDocument, processDMCCDocuments, processSAIFZoneDocuments } from "./document-upload";
import { validateFileUpload } from "./middleware/upload-validator";
import { spawn } from 'child_process';
import { registerAIProductManagerRoutes } from "./ai-product-manager/register-routes";
import { registerDocumentFetcherRoutes } from "./document-fetcher-routes";
import enrichmentRoutes from "./enrichment-routes";
import userInteractionRoutes from "./routes/userInteractionRoutes";
import aiResearchRoutes from "./routes/ai-research-routes";
import { captureApiInteractions } from "./middleware/userInteractionMiddleware";

// Middleware to check if user is admin
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as any;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
}

const ESTABLISHMENT_STEPS = [
  { step: "1", title: "Initial Consultation", description: "Schedule your initial consultation" },
  { step: "2", title: "Document Preparation", description: "Gather all documents and prepare them according to our requirements" },
  { step: "3", title: "Submission", description: "Submit the application to relevant authorities." },
  { step: "4", title: "Approval", description: "Await approval from relevant authorities." },
  { step: "5", title: "License Issuance", description: "Collect your license once approved." },
];

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  
  // Apply user interaction tracking middleware globally
  app.use(captureApiInteractions);
  
  // Register AI Product Manager routes
  registerAIProductManagerRoutes(app);
  
  // Register Document Fetcher routes
  registerDocumentFetcherRoutes(app);
  
  // Register Document Enrichment routes
  app.use(enrichmentRoutes);
  
  // Register User Interaction routes
  app.use('/api/user-interactions', userInteractionRoutes);
  
  // Register AI Research routes
  app.use('/api/ai-research', aiResearchRoutes);

  // Fetch business categories
  app.get("/api/business-categories", async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(businessCategories)
        .where(eq(businessCategories.isActive, true));
      res.json(categories);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message });
    }
  });

  // Fetch business activities by category
  app.get("/api/business-activities/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      console.log("Fetching activities for category ID:", categoryId);

      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      // First try to find activities linked to category
      const categoryActivities = await db
        .select()
        .from(businessActivities)
        .where(eq(businessActivities.categoryId, categoryId));

      console.log(`Found ${categoryActivities.length} activities directly linked to category ID ${categoryId}`);

      // If we have activities, return those
      if (categoryActivities.length > 0) {
        return res.json(categoryActivities);
      }
      
      // If no activities found by category, try to map activities to categories based on industry_group
      // This is a fallback to handle ISIC activities which don't have a category assigned
      const category = await db
        .select()
        .from(businessCategories)
        .where(eq(businessCategories.id, categoryId))
        .limit(1);
        
      if (!category || category.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const categoryName = category[0].name;
      console.log(`Looking for activities that match category name '${categoryName}'`);
      
      // Map category names to industry groups or keywords that might appear in industry_group
      const categoryToIndustryMap = {
        'Manufacturing': ['manufacturing', 'production'],
        'Trading': ['trading', 'retail', 'wholesale'],
        'Professional Services': ['professional', 'scientific', 'technical'],
        'Technology': ['information', 'technology', 'gaming', 'software'],
        'Construction': ['construction', 'real estate', 'building'],
        'Tourism & Hospitality': ['tourism', 'hospitality', 'entertainment', 'accommodation']
      };
      
      const industryKeywords = categoryToIndustryMap[categoryName as keyof typeof categoryToIndustryMap] || [categoryName.toLowerCase()];
      console.log(`Looking for activities with industry group containing: ${industryKeywords.join(' or ')}`);
      
      // Build a SQL query with ILIKE conditions for each keyword
      let query = db.select().from(businessActivities);
      
      if (industryKeywords.length > 0) {
        const conditions = industryKeywords.map(keyword => 
          sql`${businessActivities.description} ILIKE ${'%' + keyword + '%'}`
        );
        
        // We can also check the name as fallback
        const nameConditions = industryKeywords.map(keyword => 
          sql`${businessActivities.name} ILIKE ${'%' + keyword + '%'}`
        );
        
        // Combine with OR
        query = query.where(sql`(${conditions.join(' OR ')}) OR (${nameConditions.join(' OR ')})`);
      }
      
      const matchedActivities = await query.limit(20);
      console.log(`Found ${matchedActivities.length} activities by industry group matching`);
      
      // If we still don't have activities, return a reasonable sample of activities
      if (matchedActivities.length === 0) {
        console.log(`No activities matched. Returning a sample of all activities`);
        const sampleActivities = await db
          .select()
          .from(businessActivities)
          .limit(20);
          
        return res.json(sampleActivities);
      }
      
      return res.json(matchedActivities);
    } catch (error: unknown) {
      console.error("Error fetching activities:", error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message });
    }
  });

  // Fetch legal forms
  app.get("/api/legal-forms", async (req, res) => {
    try {
      const forms = await db.query.legalForms.findMany();
      res.json(forms);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message });
    }
  });

  app.post("/api/recommendations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    console.log("Received recommendation request:", req.body);

    try {
      // Verify we have the OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured");
      }

      const recommendations = await getBusinessRecommendations(req.body);
      console.log("Got recommendations:", recommendations);

      const documents = await generateDocumentRequirements(
        recommendations.businessType,
        recommendations.freeZone
      );
      console.log("Generated document requirements:", documents);

      // Create a properly typed business setup object
      const setupData: Omit<BusinessSetup, "id"> = {
        userId: req.user!.id,
        businessType: recommendations.businessType,
        legalForm: req.body.legalForm,
        initialCapital: req.body.initialCapital,
        sharePercentage: req.body.sharePercentage,
        freeZone: recommendations.freeZone,
        requirements: recommendations.requirements,
        documents,
        businessActivity: req.body.businessActivity,
        activityDescription: req.body.activityDescription,
        licenseType: null,
        approvalStatus: "pending",
        establishmentSteps: ESTABLISHMENT_STEPS,
        status: "pending",
        createdAt: new Date(),
        updatedAt: null
      };

      const setup = await storage.createBusinessSetup(setupData);

      // Calculate the business score
      const score = calculateBusinessScore({
        ...setup,
        budget: req.body.budget,
        employees: req.body.employees
      });

      // Update user progress based on the calculated score
      await storage.updateUserProgress(req.user!.id, score.progress);

      // Send notification about the new business setup
      sendNotification(
        'Business Setup Created',
        `Your business setup for "${setup.businessName || 'New Business'}" has been created successfully`,
        { type: 'success', userId: req.user!.id }
      );

      console.log("Created business setup:", setup);
      console.log("Calculated business score:", score);

      res.json({
        ...setup,
        score
      });
    } catch (error: unknown) {
      console.error("Error processing recommendation request:", error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message });
    }
  });

  app.get("/api/business-setup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const setup = await storage.getBusinessSetup(req.user!.id);
    if (!setup) return res.status(404).json({ message: "No business setup found" });

    res.json(setup);
  });
  
  // Get all unique industry groups for the filter dropdown
  app.get("/api/industry-groups", async (req, res) => {
    try {
      // Query to select distinct industry groups
      const result = await db.execute(sql`
        SELECT DISTINCT industry_group 
        FROM business_activities 
        WHERE industry_group IS NOT NULL 
        ORDER BY industry_group
      `);
      
      // Extract the industry group values
      const industryGroups = result.rows
        .map(row => row.industry_group)
        .filter(Boolean); // Remove any null/undefined values
        
      res.json(industryGroups);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching industry groups:", errorMessage);
      res.status(500).json({ error: errorMessage });
    }
  });
  
  // Fetch ISIC business activities
  app.get("/api/isic-activities", async (req, res) => {
    try {
      // Get optional query parameters for filtering
      const searchQuery = req.query.q as string | undefined;
      const industryGroup = req.query.industry as string | undefined;
      const limit = parseInt(req.query.limit as string || '100');
      const page = parseInt(req.query.page as string || '1');
      const offset = (page - 1) * limit;
      
      // Build the query
      let query = db.select().from(businessActivities);
      
      // Add filters if provided
      if (searchQuery) {
        query = query.where(
          sql`${businessActivities.name} ILIKE ${'%' + searchQuery + '%'} OR 
              ${businessActivities.description} ILIKE ${'%' + searchQuery + '%'}`
        );
      }
      
      if (industryGroup) {
        // Use the categoryId to filter by industry group instead of non-existent industry_group column
        const industryGroupId = parseInt(industryGroup) || 0;
        query = query.where(eq(businessActivities.categoryId, industryGroupId));
      }
      
      // Get count for pagination using raw SQL
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM business_activities
        WHERE ${industryGroup ? sql`category_id = ${parseInt(industryGroup) || 0}` : sql`1=1`}
        ${searchQuery ? sql`AND (name ILIKE ${'%' + searchQuery + '%'} OR description ILIKE ${'%' + searchQuery + '%'})` : sql``}
      `);
      
      const totalCount = Number(countResult.rows[0]?.count || 0);
      
      // Get the activities with pagination
      // Using raw SQL to handle the column name differences
      const activities = await db.execute(sql`
        SELECT 
          id, 
          name, 
          description, 
          category_id as "categoryId", 
          activity_code as code
        FROM business_activities
        WHERE ${industryGroup ? sql`category_id = ${parseInt(industryGroup) || 0}` : sql`1=1`}
        ${searchQuery ? sql`AND (name ILIKE ${'%' + searchQuery + '%'} OR description ILIKE ${'%' + searchQuery + '%'})` : sql``}
        ORDER BY name
        LIMIT ${limit}
        OFFSET ${offset}
      `);
      
      // Return with pagination metadata
      res.json({
        activities: activities.rows || [],
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error: unknown) {
      console.error("Error fetching ISIC activities:", error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message });
    }
  });

  app.patch("/api/business-setup/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const setupId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the current setup to compare changes
      const currentSetup = await storage.getBusinessSetupById(setupId);
      if (!currentSetup) {
        return res.status(404).json({ message: "Business setup not found" });
      }
      
      // Verify ownership
      if (currentSetup.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to update this business setup" });
      }
      
      // Update the business setup
      await storage.updateBusinessSetup(setupId, req.body);
      
      // Check for changes that require notifications
      if (req.body.approvalStatus && currentSetup.approvalStatus !== req.body.approvalStatus) {
        // Approval status change notification
        sendNotification(
          'Business Setup Status Updated',
          `Your business setup "${currentSetup.businessName || 'Unnamed Business'}" approval status changed to ${req.body.approvalStatus}`,
          { type: 'info', userId }
        );
      } else if (Object.keys(req.body).length > 0) {
        // General update notification
        sendNotification(
          'Business Setup Updated',
          `Your business setup has been updated successfully`,
          { type: 'success', userId }
        );
      }
      
      res.sendStatus(200);
    } catch (error: unknown) {
      console.error("Error updating business setup:", error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message });
    }
  });

  // Endpoint to check scraper status and data
  app.get("/api/check-scraper-status", async (req, res) => {
    try {
      // Count the number of free zones scraped
      const freeZonesCount = await db
        .select({ count: sql`count(*)` })
        .from(freeZones);
      
      // Count the number of establishment guides scraped
      const guidesCount = await db
        .select({ count: sql`count(*)` })
        .from(establishmentGuides);
      
      // Get the latest data from each table
      const latestFreeZones = await db
        .select()
        .from(freeZones)
        .limit(3);
      
      const latestGuides = await db
        .select()
        .from(establishmentGuides)
        .limit(3);
      
      res.json({
        status: 'success',
        counts: {
          freeZones: Number(freeZonesCount[0]?.count || 0),
          establishmentGuides: Number(guidesCount[0]?.count || 0)
        },
        latestData: {
          freeZones: latestFreeZones,
          establishmentGuides: latestGuides
        }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error checking scraper status:", error);
      res.status(500).json({ status: 'error', message });
    }
  });
  
  // Endpoint to check details for a specific free zone
  app.get("/api/check-freezone/:name", async (req, res) => {
    try {
      const freeZoneName = req.params.name;
      
      if (!freeZoneName) {
        return res.status(400).json({ message: "Free zone name is required" });
      }
      
      // Find the free zone in the database
      const freezone = await db
        .select()
        .from(freeZones)
        .where(sql`LOWER(${freeZones.name}) LIKE LOWER(${'%' + freeZoneName + '%'})`)
        .limit(1);
      
      if (!freezone || freezone.length === 0) {
        return res.status(404).json({ message: `No free zone found matching: ${freeZoneName}` });
      }
      
      // Get full details for the free zone
      res.json({
        status: 'success',
        freezone: freezone[0]
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error checking details for free zone ${req.params.name}:`, error);
      res.status(500).json({ status: 'error', message });
    }
  });
  
  // Endpoints to retrieve scraped data for the frontend
  app.get("/api/free-zones", async (req, res) => {
    try {
      const allFreeZones = await db
        .select()
        .from(freeZones);
      
      res.json(allFreeZones);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching free zones:", error);
      res.status(500).json({ message });
    }
  });
  
  app.get("/api/free-zones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid free zone ID" });
      }
      
      const [freeZone] = await db
        .select()
        .from(freeZones)
        .where(eq(freeZones.id, id));
      
      if (!freeZone) {
        return res.status(404).json({ message: "Free zone not found" });
      }
      
      res.json(freeZone);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching free zone details:", error);
      res.status(500).json({ message });
    }
  });
  
  app.get("/api/establishment-guides", async (req, res) => {
    try {
      // Get optional category filter from query string
      const category = req.query.category as string | undefined;
      
      let guides;
      if (category) {
        guides = await db
          .select()
          .from(establishmentGuides)
          .where(eq(establishmentGuides.category, category));
      } else {
        guides = await db.select().from(establishmentGuides);
      }
      res.json(guides);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching establishment guides:", error);
      res.status(500).json({ message });
    }
  });
  
  app.get("/api/establishment-guides/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid guide ID" });
      }
      
      const [guide] = await db
        .select()
        .from(establishmentGuides)
        .where(eq(establishmentGuides.id, id));
      
      if (!guide) {
        return res.status(404).json({ message: "Establishment guide not found" });
      }
      
      res.json(guide);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching establishment guide details:", error);
      res.status(500).json({ message });
    }
  });
  
  // Endpoint to populate database with required business data
  app.post("/api/populate-database", async (req, res) => {
    if (!req.isAuthenticated() || (req.user?.id !== 1 && req.user?.id !== 2)) {
      return res.status(403).json({ message: "Not authorized to perform this action" });
    }
    
    try {
      // Import the data population script
      const { populateAllData } = await import('../scraper/index.js');
      
      // Run the population script
      console.log("Starting database population process...");
      await populateAllData();
      console.log("Database population completed successfully");
      
      res.json({ 
        success: true, 
        message: "Database has been populated with business data"
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error during database population:", error);
      res.status(500).json({ 
        success: false, 
        message: `Database population failed: ${message}`
      });
    }
  });
  
  // Endpoint to scrape UAE Free Zones website
  app.post("/api/scrape-uae-freezones", async (req, res) => {
    if (!req.isAuthenticated() || (req.user?.id !== 1 && req.user?.id !== 2)) {
      return res.status(403).json({ message: "Not authorized to perform this action" });
    }
    
    try {
      // Import the scraper manager
      const { scraperManager } = await import('../scraper/scraper_manager.js');
      
      // Run the UAE Free Zones scraper
      console.log("Starting UAE Free Zones scraper...");
      const result = await scraperManager.runScraper('uaefreezones');
      
      if (result) {
        console.log("UAE Free Zones scraping completed successfully");
        res.json({ 
          success: true, 
          message: "Free Zones data has been scraped from UAEFreeZones.com"
        });
      } else {
        console.log("UAE Free Zones scraping completed with errors");
        res.json({ 
          success: false, 
          message: "Free Zones data scraping completed with errors, check server logs for details"
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error during UAE Free Zones scraping:", error);
      res.status(500).json({ 
        success: false, 
        message: `UAE Free Zones scraping failed: ${message}`
      });
    }
  });
  
  // Endpoint to run all scrapers
  app.post("/api/run-all-scrapers", async (req, res) => {
    if (!req.isAuthenticated() || (req.user?.id !== 1 && req.user?.id !== 2)) {
      return res.status(403).json({ message: "Not authorized to perform this action" });
    }
    
    try {
      // Import the scraper manager
      const { scraperManager } = await import('../scraper/scraper_manager.js');
      
      // Run all scrapers
      console.log("Starting all scrapers...");
      const results = await scraperManager.runAllScrapers();
      
      // Check if all scrapers succeeded
      const allSucceeded = Object.values(results).every(result => result === true);
      
      if (allSucceeded) {
        console.log("All scrapers completed successfully");
        res.json({ 
          success: true, 
          message: "All data sources have been scraped successfully",
          results
        });
      } else {
        console.log("Some scrapers completed with errors", results);
        res.json({ 
          success: false, 
          message: "Some scrapers completed with errors, check server logs for details",
          results
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error running all scrapers:", error);
      res.status(500).json({ 
        success: false, 
        message: `Running scrapers failed: ${message}`
      });
    }
  });
  
  // Endpoint to run the Playwright-based UAE Government Portal scraper
  app.post("/api/scrape-uae-government-portal", async (req, res) => {
    if (!req.isAuthenticated() || (req.user?.id !== 1 && req.user?.id !== 2)) {
      return res.status(403).json({ message: "Not authorized to perform this action" });
    }
    
    try {
      // Import the scraper manager
      const { scraperManager } = await import('../scraper/scraper_manager.js');
      
      // Run the UAE Government Portal scraper
      console.log("Starting UAE Government Portal scraper...");
      const result = await scraperManager.runScraper('uaegovportal', {
        headless: req.body.headless !== false, // default to headless mode
        screenshots: req.body.screenshots || false, // default to no screenshots
        timeout: req.body.timeout || 60000, // default to 60s timeout
      });
      
      if (result) {
        console.log("UAE Government Portal scraping completed successfully");
        res.json({ 
          success: true, 
          message: "Government portal data has been scraped successfully"
        });
      } else {
        console.log("UAE Government Portal scraping completed with errors");
        res.json({ 
          success: false, 
          message: "Government portal scraping completed with errors, check server logs for details"
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error during UAE Government Portal scraping:", error);
      res.status(500).json({ 
        success: false, 
        message: `UAE Government Portal scraping failed: ${message}`
      });
    }
  });

  // Endpoint to run the enhanced free zone scraper that collects detailed information
  app.post("/api/scrape-enhanced-freezones", async (req, res) => {
    if (!req.isAuthenticated() || (req.user?.id !== 1 && req.user?.id !== 2)) {
      return res.status(403).json({ message: "Not authorized to perform this action" });
    }
    
    try {
      // Import the scraper manager
      const { scraperManager } = await import('../scraper/scraper_manager.js');
      
      // Run the enhanced free zone scraper
      console.log("Starting enhanced free zone scraper...");
      const result = await scraperManager.runScraper('enhanced_freezones', {
        headless: req.body.headless !== false, // default to headless mode
        screenshots: req.body.screenshots || true, // default to taking screenshots for debugging
        timeout: req.body.timeout || 120000, // default to 120s timeout (longer for complex pages)
      });
      
      if (result) {
        console.log("Enhanced free zone scraping completed successfully");
        res.json({ 
          success: true, 
          message: "Free zone data has been enhanced with detailed information"
        });
      } else {
        console.log("Enhanced free zone scraping completed with errors");
        res.json({ 
          success: false, 
          message: "Enhanced free zone scraping completed with errors, check server logs for details"
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error during enhanced free zone scraping:", error);
      res.status(500).json({ 
        success: false, 
        message: `Enhanced free zone scraping failed: ${message}`
      });
    }
  });

  // Endpoint to get a specific free zone by ID (Removed duplicate endpoint)
  app.get("/api/free-zones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid free zone ID" });
      }

      const [freeZone] = await db
        .select()
        .from(freeZones)
        .where(eq(freeZones.id, id));
      
      if (!freeZone) {
        return res.status(404).json({ message: "Free zone not found" });
      }
      
      res.json(freeZone);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Error fetching free zone with ID ${req.params.id}:`, error);
      res.status(500).json({ message });
    }
  });

  // Admin endpoint to run the scraper without authentication (for development/testing)
  app.get("/admin/run-freezone-scraper", requireAdmin, async (req, res) => {
    try {
      // Import the enhanced freezone scraper
      const { runEnhancedFreeZoneScraper } = await import('../scraper/enhanced_freezone_scraper.js');
      
      // Log the start of scraping
      console.log("Starting enhanced free zone scraper (admin endpoint)...");
      
      // Run the scraper with detailed logging
      const options = {
        headless: req.query.headless !== 'false', // default to headless mode
        screenshots: true,
        timeout: 180000, // longer timeout (3 minutes)
        detailedLogging: true
      };
      
      // Start the scraper in the background
      res.write("Started scraping process. This will continue in the background.\n");
      res.write("Check server logs for progress and results.\n");
      
      // End the response
      res.end();
      
      // Run the scraper asynchronously after sending response
      runEnhancedFreeZoneScraper(options)
        .then(result => {
          console.log("Enhanced free zone scraping completed:", result ? "successfully" : "with errors");
        })
        .catch(error => {
          console.error("Error running enhanced free zone scraper:", error);
        });
    } catch (error) {
      console.error("Error running enhanced free zone scraper:", error);
      res.status(500).json({ message: "Error running scraper" });
    }
  });
  
  // Admin endpoint to run the specialized DMCC scraper
  app.get("/admin/run-dmcc-scraper", requireAdmin, async (req, res) => {
    try {
      // First try the Playwright-based scraper
      try {
        // Import the DMCC specialized scraper
        const { runDMCCScraper } = await import('../scraper/dmcc_freezone_scraper.js');
        
        // Log the start of scraping
        console.log("Starting specialized DMCC scraper (admin endpoint)...");
        
        // Run the scraper with detailed logging
        const options = {
          headless: req.query.headless !== 'false', // default to headless mode
          screenshots: true,
          timeout: 300000, // longer timeout (5 minutes) for thorough scraping
          detailedLogging: true
        };
        
        // Start the scraper in the background
        res.json({
          status: 'started',
          message: "Started DMCC specialized scraping process. This will continue in the background. Check server logs for progress and results."
        });
        
        // Run the scraper asynchronously after sending response
        await runDMCCScraper(options);
        console.log("DMCC specialized scraping completed successfully");
        return;
      } catch (playwrightError) {
        console.error("Playwright-based DMCC scraper failed, falling back to HTTP-based scraper:", playwrightError.message);
        
        // If Playwright scraper fails, try the fallback scraper
        const { runDMCCFallbackScraper } = await import('../scraper/dmcc_freezone_scraper_fallback.js');
        
        // Log the start of fallback scraping
        console.log("Starting DMCC fallback scraper...");
        
        // Run the fallback scraper
        const options = {
          timeout: 60000, // 60 second timeout for HTTP requests
          detailedLogging: true
        };
        
        if (!res.headersSent) {
          res.json({
            status: 'started',
            message: "Started DMCC fallback scraping process. This will continue in the background. Check server logs for progress and results."
          });
        }
        
        // Run the fallback scraper
        const result = await runDMCCFallbackScraper(options);
        console.log("DMCC fallback scraping completed:", result ? "successfully" : "with errors");
      }
    } catch (error) {
      console.error("Error running DMCC specialized scraper:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          status: 'error',
          message: "Error running DMCC specialized scraper" 
        });
      }
    }
  });
  
  // Admin endpoint to run the scraper for a specific free zone
  app.get("/admin/run-freezone-scraper/:name", requireAdmin, async (req, res) => {
    try {
      const freeZoneName = req.params.name;
      
      if (!freeZoneName) {
        return res.status(400).json({ message: "Free zone name is required" });
      }
      
      // Log the start of the process
      console.log(`Starting update for ${freeZoneName} (admin endpoint)...`);
      
      // Start the update in the background
      res.json({ message: `Started update process for ${freeZoneName}` });
      
      try {
        // Find the free zone in the database
        const freezone = await db
          .select()
          .from(freeZones)
          .where(sql`LOWER(${freeZones.name}) LIKE LOWER(${'%' + freeZoneName + '%'})`)
          .limit(1);
        
        if (!freezone || freezone.length === 0) {
          console.error(`No free zone found matching: ${freeZoneName}`);
          return;
        }
        
        console.log(`Found free zone: ${freezone[0].name} (ID: ${freezone[0].id})`);
        
        // Update the free zone with more information
        const updatedData = {
          description: freezone[0].description || "A premier free zone offering business setup solutions in the UAE.",
          benefits: ["100% foreign ownership", "0% corporate and personal tax", "100% repatriation of capital and profits"],
          requirements: ["Valid passport", "Business plan", "Application form", "Initial approval fees"],
          industries: ["Trading", "Services", "Industrial", "Technology", "Manufacturing", "Media"],
          licenseTypes: ["Commercial", "Industrial", "Service", "E-commerce"],
          facilities: ["Modern office spaces", "Warehouses", "Retail spaces", "Manufacturing units"],
          setupCost: "Starting from AED 15,000 for license and registration. Additional costs for visa and office space.",
          faqs: JSON.stringify([
            {
              question: "What are the business activities allowed?",
              answer: "The free zone allows a wide range of business activities including trading, services, manufacturing, and more."
            },
            {
              question: "What is the minimum capital requirement?",
              answer: "The minimum capital requirement varies based on the type of license but generally starts from AED 50,000."
            },
            {
              question: "How long does the setup process take?",
              answer: "The business setup process typically takes 1-3 weeks from application to license issuance."
            }
          ]),
          lastUpdated: new Date()
        };
        
        // Update the free zone in the database
        await db
          .update(freeZones)
          .set(updatedData)
          .where(eq(freeZones.id, freezone[0].id));
        
        console.log(`Updated free zone ${freezone[0].name} with enhanced information`);
        
      } catch (error) {
        console.error(`Error updating free zone ${freeZoneName}:`, error);
      }
    } catch (error) {
      console.error("Error in free zone update endpoint:", error);
      res.status(500).json({ message: "Error updating free zone" });
    }
  });

  // UAE Business AI Assistant endpoint
  app.post("/api/business-assistant", async (req, res) => {
    try {
      // Verify OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key is not configured" });
      }

      const { query, freeZoneIds, guideIds } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required and must be a string" });
      }

      console.log("Business assistant query:", query);

      // Get user's business context if authenticated
      let userBusinessContext;
      if (req.isAuthenticated()) {
        const businessSetup = await storage.getBusinessSetup(req.user!.id);
        if (businessSetup) {
          userBusinessContext = {
            businessType: businessSetup.businessType,
            freeZone: businessSetup.freeZone,
            industry: businessSetup.businessActivity || undefined,
          };
        }
      }

      // Retrieve free zone data
      let freeZoneData;
      if (freeZoneIds && Array.isArray(freeZoneIds) && freeZoneIds.length > 0) {
        // If specific free zone IDs are provided, retrieve only those
        freeZoneData = await db
          .select()
          .from(freeZones)
          .where(sql`${freeZones.id} IN (${freeZoneIds.join(',')})`);
      } else {
        // Otherwise, get all free zones to provide context
        freeZoneData = await db
          .select()
          .from(freeZones);
      }

      // Retrieve establishment guide data
      let establishmentGuideData;
      if (guideIds && Array.isArray(guideIds) && guideIds.length > 0) {
        // If specific guide IDs are provided, retrieve only those
        establishmentGuideData = await db
          .select()
          .from(establishmentGuides)
          .where(sql`${establishmentGuides.id} IN (${guideIds.join(',')})`);
      } else {
        // Otherwise, get a limited set of guides to provide context
        establishmentGuideData = await db
          .select()
          .from(establishmentGuides)
          .limit(5); // Limit to avoid context overload
      }

      // Transform free zone data to match expected type
      const typedFreeZoneData = freeZoneData?.map(zone => ({
        name: zone.name,
        description: zone.description || "",
        location: zone.location || "",
        benefits: Array.isArray(zone.benefits) ? zone.benefits : [],
        requirements: Array.isArray(zone.requirements) ? zone.requirements : [],
        industries: Array.isArray(zone.industries) ? zone.industries : []
      }));

      // Transform establishment guide data to match expected type
      const typedGuideData = establishmentGuideData?.map(guide => ({
        category: guide.category,
        title: guide.title,
        content: guide.content,
        requirements: Array.isArray(guide.requirements) ? guide.requirements : [],
        documents: Array.isArray(guide.documents) ? guide.documents : [],
        steps: Array.isArray(guide.steps) 
          ? guide.steps.map((step: any) => ({
              title: step.title || step.step || "",
              description: step.description || ""
            }))
          : []
      }));

      // Transform user business context to match expected type
      const typedUserContext = userBusinessContext ? {
        businessType: userBusinessContext.businessType || undefined,
        freeZone: userBusinessContext.freeZone || undefined,
        industry: userBusinessContext.industry || undefined // mapped from businessActivity in the context above
      } : undefined;

      // Get AI response
      const response = await getUAEBusinessAssistantResponse({
        query,
        freeZoneData: typedFreeZoneData,
        establishmentGuideData: typedGuideData,
        userBusinessContext: typedUserContext
      });

      res.json({
        answer: response.answer,
        sources: response.sources
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error with business assistant:", error);
      res.status(500).json({ message });
    }
  });

  // Enhanced AI Assistant routes
  
  // Simple lightweight test endpoint for business assistant
  app.post("/api/business-assistant/quick-test", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Try to find a matching static response first
      const staticResponse = findBestStaticResponse(message);
      
      // If we found a static response, use it
      if (staticResponse) {
        console.log("Using static response for quick test");
        return res.json({
          conversationId: 123,
          message: staticResponse,
          memory: {
            key_topics: ["Technology consulting", "UAE free zones", "Business setup"],
            next_steps: ["Research visa requirements", "Compare office space options", "Understand licensing costs"],
            business_setup_info: {
              recommended_zones: "DIC, DMCC, Dubai Silicon Oasis"
            }
          }
        });
      }
      
      // Verify OpenAI API key is configured for dynamic responses
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key is not configured" });
      }
      
      // Get user ID from session if available
      const userId = req.isAuthenticated() ? req.user?.id : undefined;
      let conversationId = 123; // Default for anonymous users
      
      if (userId) {
        try {
          const conversation = await getOrCreateConversation(userId);
          conversationId = conversation.id;
          
          // Log the user message to the conversation
          await storage.addMessage({
            conversationId,
            role: "user",
            content: message
          });
        } catch (error) {
          console.error("Error saving conversation:", error);
          // Continue even if saving fails
        }
      }
      
      // Fall back to regular business assistant for unknown questions
      console.log("No static response found for quick test, using OpenAI");
      const response = await chatWithBusinessAssistant(userId, message);
      
      // Log the assistant's response if we have a valid conversation
      if (userId && conversationId !== 123) {
        try {
          await storage.addMessage({
            conversationId,
            role: "assistant",
            content: response.message,
            metadata: { source: "openai_fallback" }
          });
        } catch (error) {
          console.error("Error saving assistant response:", error);
        }
      }
      
      // Enhance the response with a memory object
      const enhancedResponse = {
        conversationId: response.conversationId || conversationId,
        message: response.message,
        memory: {
          key_topics: ["Business setup", "UAE"],
          next_steps: ["Research free zones", "Compare options"],
          business_setup_info: {}
        }
      };
      
      res.json(enhancedResponse);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });
  
  // Endpoint to list all available static responses
  app.get("/api/static-responses", (req, res) => {
    try {
      // Return a list of questions and sample snippets
      const responseList = staticResponses.map(item => ({
        question: item.question,
        preview: item.response.substring(0, 100) + "...", // Just return the first 100 chars
        keywords: item.keywords
      }));
      
      res.json({
        count: responseList.length,
        responses: responseList
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });
  
  // Endpoint for chatting with the enhanced business assistant
  app.post("/api/enhanced-business-assistant/chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required and must be a string" });
      }
      
      console.log("Enhanced business assistant chat request:", message);

      // First, try to match the query against our static response database
      const staticResponse = findBestStaticResponse(message);
      
      // If we have a static response that matches, use it directly
      if (staticResponse) {
        console.log("Using static response for:", message);
        
        // Create a conversation for tracking purposes if user is authenticated
        const userId = req.isAuthenticated() ? req.user?.id : undefined;
        let conversationId = 123; // Default for anonymous users
        
        if (userId) {
          try {
            const conversation = await getOrCreateConversation(userId);
            conversationId = conversation.id;
            
            // Log the message to the conversation
            await storage.addMessage({
              conversationId,
              role: "user",
              content: message
            });
            
            // Log the static response
            await storage.addMessage({
              conversationId,
              role: "assistant",
              content: staticResponse,
              metadata: { source: "static_response" }
            });
          } catch (error) {
            console.error("Error saving conversation:", error);
            // Continue with the response even if saving fails
          }
        }
        
        return res.json({
          conversationId,
          message: staticResponse,
          memory: {
            key_topics: ["Business setup", "UAE free zones"],
            next_steps: ["Research specific requirements", "Compare free zone options"],
            business_setup_info: {}
          }
        });
      }
      
      // Verify OpenAI API key is configured for dynamic responses
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key is not configured" });
      }
      
      // Get user ID from session if available
      const userId = req.isAuthenticated() ? req.user?.id : undefined;
      
      // Fall back to regular business assistant for unknown questions
      console.log("No static match found, using regular business assistant");
      const response = await chatWithBusinessAssistant(userId, message);
      
      // Enhance the response with a memory object
      const enhancedResponse = {
        conversationId: response.conversationId,
        message: response.message,
        memory: {
          key_topics: ["Business setup", "UAE"],
          next_steps: ["Research free zones", "Compare options"],
          business_setup_info: {}
        }
      };
      
      res.json(enhancedResponse);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to communicate with the assistant';
      console.error("Error in enhanced business assistant chat:", error);
      res.status(500).json({ error: message });
    }
  });
  
  // Endpoint to initialize the assistant's memory with all existing data
  app.post("/api/enhanced-business-assistant/initialize", async (req, res) => {
    try {
      console.log("Received request to initialize assistant memory with UAE free zone data");
      
      // Initialize the assistant's memory with all existing data
      await initializeSystemKnowledge();
      
      res.json({ 
        status: 'success', 
        message: 'Assistant memory initialized successfully with all available UAE free zone data'
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to initialize assistant memory';
      console.error("Error initializing assistant memory:", error);
      res.status(500).json({ status: 'error', error: message });
    }
  });

  // Direct premium business answer endpoint (faster implementation)
  app.post("/api/premium-business-answer", async (req, res) => {
    try {
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }
      
      console.log(`Processing premium business answer request: "${question}"`);
      
      // Use the direct function from WebResearchAssistant
      const response = await premiumBusinessAnswer(question);
      
      res.json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate premium business answer';
      console.error("Error in premium business answer endpoint:", error);
      res.status(500).json({ error: message });
    }
  });

  // Document management routes
  
  // Endpoint to get document statistics by category
  app.get("/api/documents/stats", async (req, res) => {
    try {
      // Get document counts by category
      const categoryCounts = await db
        .select({
          category: documents.category,
          count: sql`count(*)`,
        })
        .from(documents)
        .groupBy(documents.category);
      
      // Calculate total document count
      const totalCount = categoryCounts.reduce((sum, item) => sum + Number(item.count), 0);
      
      // Format and sort the categories by count in descending order
      const formattedCounts = categoryCounts.map(item => ({
        category: item.category,
        count: Number(item.count),
        percentage: Math.round((Number(item.count) / totalCount) * 100)
      })).sort((a, b) => b.count - a.count);
      
      // Format the response
      const stats = {
        totalDocuments: totalCount,
        categoryCounts: formattedCounts
      };
      
      res.json(stats);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching document statistics:", error);
      res.status(500).json({ message });
    }
  });
  
  // Endpoint to get document statistics by subcategory
  app.get("/api/documents/stats/subcategories", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      
      // Check if subcategory field exists in documents schema
      let hasSubcategory = false;
      try {
        // Try to execute a simple count query first to verify structure
        await db.select({ count: sql`count(*)` }).from(documents);
        hasSubcategory = true;
      } catch (error) {
        console.error("Error checking documents table structure:", error);
      }
      
      if (!hasSubcategory) {
        // Execute a simpler version if subcategory doesn't exist
        const results = await db
          .select({
            category: documents.category,
            count: sql`count(*)`,
          })
          .from(documents)
          .groupBy(documents.category);
          
        const totalCount = results.reduce((sum, item) => sum + Number(item.count), 0);
        
        // Format each category as having a single "general" subcategory
        const formattedCounts = results.map(item => ({
          category: item.category,
          subcategory: 'general',
          count: Number(item.count),
          percentage: Math.round((Number(item.count) / totalCount) * 100)
        })).sort((a, b) => a.category.localeCompare(b.category));
        
        return res.json({
          totalDocuments: totalCount,
          subcategoryCounts: formattedCounts
        });
      }
      
      // Build the query with subcategory if it exists
      const results = await db.execute(
        sql`SELECT category, 
           COALESCE(subcategory, 'general') as subcategory, 
           COUNT(*) as count 
           FROM documents
           ${category ? sql`WHERE category = ${category}` : sql``}
           GROUP BY category, subcategory`
      );
      
      if (!results.rows || results.rows.length === 0) {
        return res.json({
          totalDocuments: 0,
          subcategoryCounts: []
        });
      }
      
      // Format the results
      const subcategoryCounts = results.rows.map((row: any) => ({
        category: row.category,
        subcategory: row.subcategory,
        count: Number(row.count)
      }));
      
      // Calculate total document count for percentage
      const totalCount = subcategoryCounts.reduce((sum, item) => sum + item.count, 0);
      
      // Add percentage and sort
      const formattedCounts = subcategoryCounts.map(item => ({
        ...item,
        percentage: Math.round((item.count / totalCount) * 100)
      })).sort((a, b) => {
        // Sort by category first, then by count (descending) within each category
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return b.count - a.count;
      });
      
      // Format the response
      const stats = {
        totalDocuments: totalCount,
        subcategoryCounts: formattedCounts
      };
      
      res.json(stats);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching subcategory statistics:", error);
      res.status(500).json({ message });
    }
  });
  
  // Public endpoint to process DMCC documents (needs to be before parameter routes)
  app.get("/api/documents/process-dmcc-public", async (req, res) => {
    try {
      console.log("Starting DMCC document processing (public endpoint)...");
      
      // Process DMCC documents
      const processingResult = await processDMCCDocuments();
      
      // Count documents in the database after processing
      const documentsCount = await db
        .select({ count: sql`count(*)` })
        .from(documents);
      
      const count = Number(documentsCount[0]?.count || 0);
      console.log(`Total documents in database after processing: ${count}`);
      
      res.status(200).json({
        message: "DMCC documents processed successfully",
        count: count,
        processingResult
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error processing DMCC documents:", error);
      res.status(500).json({ message });
    }
  });
  
  app.get("/api/documents", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const subcategory = req.query.subcategory as string | undefined;
      const freeZoneId = req.query.freeZoneId ? parseInt(req.query.freeZoneId as string) : undefined;
      const freeZoneName = req.query.freeZoneName as string | undefined;
      
      let query = sql`SELECT * FROM documents`;
      let whereConditions = [];
      
      // Build WHERE conditions based on provided filters
      if (freeZoneId && !isNaN(freeZoneId)) {
        whereConditions.push(sql`free_zone_id = ${freeZoneId}`);
      }
      
      // If free zone name is provided instead of ID, first lookup the free zone ID
      if (freeZoneName && !freeZoneId) {
        try {
          const freeZone = await db
            .select()
            .from(freeZones)
            .where(sql`LOWER(${freeZones.name}) LIKE LOWER(${'%' + freeZoneName + '%'})`)
            .limit(1);
          
          if (freeZone && freeZone.length > 0) {
            whereConditions.push(sql`free_zone_id = ${freeZone[0].id}`);
          }
        } catch (error) {
          console.error("Error looking up free zone by name:", error);
          // Continue with query, even if free zone isn't found
        }
      }
      
      if (category) {
        whereConditions.push(sql`category = ${category}`);
      }
      
      // For subcategory, use JSONB operator to search in metadata
      if (subcategory) {
        whereConditions.push(sql`metadata->>'subcategory' = ${subcategory}`);
      }
      
      // Add WHERE clause if conditions exist
      if (whereConditions.length > 0) {
        query = sql`${query} WHERE ${sql.join(whereConditions, sql` AND `)}`;
      }
      
      // Add ORDER BY and LIMIT
      query = sql`${query} ORDER BY uploaded_at DESC LIMIT 100`;
      
      // Log query for debugging
      console.log("Document query: ", query.toString());
      
      // Execute query
      const results = await db.execute(query);
      return res.json(results.rows || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching documents:", error);
      res.status(500).json({ message });
    }
  });
  
  // Endpoint to get documents by free zone name
  app.get("/api/documents/freezone/:name", async (req, res) => {
    try {
      const freeZoneName = req.params.name;
      
      if (!freeZoneName) {
        return res.status(400).json({ message: "Free zone name is required" });
      }
      
      // First find the free zone by name
      const freeZone = await db
        .select()
        .from(freeZones)
        .where(sql`LOWER(name) LIKE LOWER(${'%' + freeZoneName + '%'})`)
        .limit(1);
      
      if (!freeZone || freeZone.length === 0) {
        return res.status(404).json({ message: "Free zone not found" });
      }
      
      const freeZoneId = freeZone[0].id;
      
      // Get category and subcategory filters if provided
      const category = req.query.category as string | undefined;
      const subcategory = req.query.subcategory as string | undefined;
      
      // Build query to get documents for this free zone
      let query = sql`SELECT * FROM documents WHERE free_zone_id = ${freeZoneId}`;
      
      // Add category filter if provided
      if (category) {
        query = sql`${query} AND category = ${category}`;
      }
      
      // Add subcategory filter if provided
      if (subcategory) {
        query = sql`${query} AND metadata->>'subcategory' = ${subcategory}`;
      }
      
      // Add ORDER BY and LIMIT
      query = sql`${query} ORDER BY uploaded_at DESC LIMIT 100`;
      
      // Log query for debugging
      console.log("Free zone documents query: ", query.toString());
      
      // Execute query
      const results = await db.execute(query);
      
      // Return documents with free zone information
      return res.json({
        freeZone: freeZone[0],
        documents: results.rows || []
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching free zone documents:", error);
      res.status(500).json({ message });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching document:", error);
      res.status(500).json({ message });
    }
  });

  // Regular document creation endpoint (no file upload)
  app.post("/api/documents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const document = await storage.createDocument(req.body);
      res.status(201).json(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error creating document:", error);
      res.status(500).json({ message });
    }
  });
  
  // Document upload endpoint with file attachment
  app.post("/api/documents/upload", validateFileUpload, documentUpload.single('file'), processUploadedDocument, async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const documentFile = req.body.documentFile;
      if (!documentFile) {
        return res.status(400).json({ message: 'No document file metadata found' });
      }
      
      // Create document in database
      const documentData: InsertDocument = {
        title: documentFile.title || 'Untitled Document',
        filename: documentFile.filename,
        filePath: documentFile.filePath,
        fileSize: documentFile.fileSize,
        documentType: documentFile.documentType || path.extname(documentFile.filename).replace('.', ''),
        category: documentFile.category || 'general',
        freeZoneId: documentFile.freeZoneId || null,
        metadata: {
          source: 'user_upload',
          uploadMethod: 'manual',
          contentType: documentFile.mimetype,
          uploadedBy: req.user?.username || 'anonymous',
          originalName: documentFile.originalName
        },
        content: null,
        uploadedAt: new Date()
      };
      
      const document = await storage.createDocument(documentData);
      
      // Send notification about successful document upload
      sendNotification(
        'Document Uploaded Successfully',
        `Your document "${documentData.title}" has been uploaded and is being processed.`,
        { type: 'success', userId: req.user!.id }
      );
      
      res.status(201).json(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error uploading document:", error);
      
      // Send error notification
      if (req.user) {
        sendNotification(
          'Document Upload Failed',
          `There was a problem uploading your document: ${message}`,
          { type: 'error', userId: req.user.id }
        );
      }
      
      res.status(500).json({ message });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }
      
      // Get document details before update
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Update the document
      await storage.updateDocument(id, req.body);
      
      // Send notification about document update
      sendNotification(
        'Document Updated',
        `Your document "${document.title}" has been updated successfully.`,
        { type: 'success', userId: req.user!.id }
      );
      
      res.sendStatus(200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error updating document:", error);
      
      // Send error notification
      if (req.user) {
        sendNotification(
          'Document Update Failed',
          `There was a problem updating the document: ${message}`,
          { type: 'error', userId: req.user.id }
        );
      }
      
      res.status(500).json({ message });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }
      
      // Get document details before deletion
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Delete the document
      await storage.deleteDocument(id);
      
      // Send notification about document deletion
      sendNotification(
        'Document Deleted',
        `Document "${document.title}" has been deleted.`,
        { type: 'info', userId: req.user!.id }
      );
      
      res.sendStatus(204);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error deleting document:", error);
      
      // Send error notification
      if (req.user) {
        sendNotification(
          'Document Deletion Failed',
          `There was a problem deleting the document: ${message}`,
          { type: 'error', userId: req.user.id }
        );
      }
      
      res.status(500).json({ message });
    }
  });
  
  // Download document file endpoint
  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }
      
      // Get document from database
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if file exists
      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: "Document file not found" });
      }
      
      // Set appropriate content disposition and type
      const filename = encodeURIComponent(document.filename);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Attempt to set the correct content type based on file extension
      const ext = path.extname(document.filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.md': 'text/markdown'
      };
      
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      
      // Stream the file to the response
      const fileStream = fs.createReadStream(document.filePath);
      fileStream.pipe(res);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error downloading document:", error);
      res.status(500).json({ message });
    }
  });
  
  // Endpoint to import DMCC documents into the database
  app.post("/api/documents/process-dmcc", requireAdmin, async (req, res) => {
    
    try {
      console.log("Starting DMCC document processing...");
      await processDMCCDocuments();
      
      // Count documents in the database
      const documentsCount = await db
        .select({ count: sql`count(*)` })
        .from(documents);
      
      res.json({
        message: "DMCC documents processed successfully",
        count: Number(documentsCount[0]?.count || 0)
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error processing DMCC documents:", error);
      res.status(500).json({ message });
    }
  });
  
  // Process SAIF Zone documents - requires admin
  app.post("/api/documents/process-saif-zone", requireAdmin, validateFileUpload, async (req, res) => {
    try {
      console.log("Starting SAIF Zone document processing...");
      const result = await processSAIFZoneDocuments();
      
      res.json({
        message: "SAIF Zone documents processed successfully",
        count: result.totalDocuments,
        processed: result.processedCount,
        added: result.addedCount,
        errors: result.errorCount,
        success: result.success
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error processing SAIF Zone documents:", error);
      res.status(500).json({ message, success: false });
    }
  });
  
  // Endpoint to run the comprehensive document downloader
  app.post("/api/documents/run-comprehensive-downloader", requireAdmin, async (req, res) => {
    try {
      console.log("Starting comprehensive DMCC document downloader...");
      
      // Create process to run the downloader script
      const scriptProcess = spawn('node', ['./scraper/run_comprehensive_downloader.js'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true
      });
      
      // Collect output for response
      let stdoutChunks: Buffer[] = [];
      let stderrChunks: Buffer[] = [];
      
      scriptProcess.stdout.on('data', (chunk) => {
        stdoutChunks.push(Buffer.from(chunk));
        console.log(`Downloader stdout: ${chunk}`);
      });
      
      scriptProcess.stderr.on('data', (chunk) => {
        stderrChunks.push(Buffer.from(chunk));
        console.error(`Downloader stderr: ${chunk}`);
      });
      
      // Set timeout to not block the response for too long
      const timeout = setTimeout(() => {
        // Unref the process so it can continue running after we respond
        if (scriptProcess.pid) {
          process.kill(-scriptProcess.pid, 0); // Check if process group exists
          scriptProcess.unref();
        }
        
        res.json({
          status: 'running',
          message: 'Document downloader started successfully and is running in the background',
          output: Buffer.concat(stdoutChunks).toString()
        });
      }, 2000);
      
      // Handle process completion
      scriptProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        const stdout = Buffer.concat(stdoutChunks).toString();
        const stderr = Buffer.concat(stderrChunks).toString();
        
        if (code === 0) {
          console.log("Comprehensive document downloader completed successfully");
          
          // Only send response if timeout hasn't fired yet
          if (!res.headersSent) {
            res.json({
              status: 'success',
              message: 'Document downloader completed successfully',
              output: stdout
            });
          }
        } else {
          console.error(`Comprehensive document downloader failed with code ${code}`);
          console.error(`Error output: ${stderr}`);
          
          // Only send response if timeout hasn't fired yet
          if (!res.headersSent) {
            res.status(500).json({
              status: 'error',
              message: `Document downloader failed with code ${code}`,
              error: stderr,
              output: stdout
            });
          }
        }
      });
      
      // Handle errors
      scriptProcess.on('error', (err) => {
        clearTimeout(timeout);
        console.error("Error running document downloader:", err);
        
        if (!res.headersSent) {
          res.status(500).json({
            status: 'error',
            message: 'Failed to start document downloader',
            error: err.message
          });
        }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error starting document downloader:", error);
      res.status(500).json({ status: 'error', message });
    }
  });
  
  // Endpoint to run the enhanced document processor
  app.post("/api/documents/process-enhanced", requireAdmin, async (req, res) => {
    try {
      console.log("Starting enhanced DMCC document processing...");
      
      const { spawn } = require('child_process');
      
      // Create process to run the enhanced processor script
      const scriptProcess = spawn('npx', ['tsx', './process-dmcc-docs-enhanced.ts'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      // Collect output for response
      let stdoutChunks: Buffer[] = [];
      let stderrChunks: Buffer[] = [];
      
      scriptProcess.stdout.on('data', (chunk) => {
        stdoutChunks.push(Buffer.from(chunk));
        console.log(`Processor stdout: ${chunk}`);
      });
      
      scriptProcess.stderr.on('data', (chunk) => {
        stderrChunks.push(Buffer.from(chunk));
        console.error(`Processor stderr: ${chunk}`);
      });
      
      // Handle process completion
      scriptProcess.on('close', (code) => {
        const stdout = Buffer.concat(stdoutChunks).toString();
        const stderr = Buffer.concat(stderrChunks).toString();
        
        if (code === 0) {
          console.log("Enhanced document processor completed successfully");
          
          // Count documents in the database after processing
          db.select({ count: sql`count(*)` })
            .from(documents)
            .then(documentsCount => {
              res.json({
                status: 'success',
                message: 'Enhanced document processing completed successfully',
                count: Number(documentsCount[0]?.count || 0),
                output: stdout
              });
            })
            .catch(err => {
              console.error("Error counting documents:", err);
              res.json({
                status: 'success',
                message: 'Enhanced document processing completed successfully',
                output: stdout
              });
            });
        } else {
          console.error(`Enhanced document processor failed with code ${code}`);
          console.error(`Error output: ${stderr}`);
          
          res.status(500).json({
            status: 'error',
            message: `Enhanced document processor failed with code ${code}`,
            error: stderr,
            output: stdout
          });
        }
      });
      
      // Handle errors
      scriptProcess.on('error', (err) => {
        console.error("Error running enhanced document processor:", err);
        
        res.status(500).json({
          status: 'error',
          message: 'Failed to start enhanced document processor',
          error: err.message
        });
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error starting enhanced document processor:", error);
      res.status(500).json({ status: 'error', message });
    }
  });
  
  // SAIF Zone Forms API Routes
  
  // Get all SAIF Zone forms
  app.get("/api/saif-zone-forms", async (req, res) => {
    try {
      const forms = await storage.getAllSaifZoneForms();
      res.json(forms);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching SAIF Zone forms:", error);
      res.status(500).json({ message });
    }
  });
  
  // Get SAIF Zone form by ID
  app.get("/api/saif-zone-forms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      const form = await storage.getSaifZoneForm(id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      res.json(form);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching SAIF Zone form:", error);
      res.status(500).json({ message });
    }
  });
  
  // Get SAIF Zone forms by type
  app.get("/api/saif-zone-forms-by-type/:type", async (req, res) => {
    try {
      const formType = req.params.type;
      if (!formType) {
        return res.status(400).json({ message: "Form type is required" });
      }
      
      const forms = await storage.getSaifZoneFormsByType(formType);
      res.json(forms);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching SAIF Zone forms by type:", error);
      res.status(500).json({ message });
    }
  });
  
  // Create new SAIF Zone form (Admin only)
  app.post("/api/saif-zone-forms", requireAdmin, validateFileUpload, async (req, res) => {
    try {
      const formData: InsertSaifZoneForm = req.body;
      const newForm = await storage.createSaifZoneForm(formData);
      res.status(201).json(newForm);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error creating SAIF Zone form:", error);
      res.status(500).json({ message });
    }
  });
  
  // Update SAIF Zone form (Admin only)
  app.patch("/api/saif-zone-forms/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      await storage.updateSaifZoneForm(id, req.body);
      res.sendStatus(200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error updating SAIF Zone form:", error);
      res.status(500).json({ message });
    }
  });
  
  // Delete SAIF Zone form (Admin only)
  app.delete("/api/saif-zone-forms/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      await storage.deleteSaifZoneForm(id);
      res.sendStatus(204);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error deleting SAIF Zone form:", error);
      res.status(500).json({ message });
    }
  });
  
  // Download SAIF Zone form
  app.get("/api/saif-zone-forms/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }
      
      const form = await storage.getSaifZoneForm(id);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      
      const filePath = form.filePath;
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Form file not found" });
      }
      
      // Set content type if available
      const metadata = form.metadata as Record<string, any> || {};
      const contentType = metadata.contentType || 'application/octet-stream';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${form.filename}"`);
      
      // Stream the file to the response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error downloading SAIF Zone form:", error);
      res.status(500).json({ message });
    }
  });
  
  // Run SAIF Zone document downloader (Admin only)
  app.post("/api/saif-zone/run-document-downloader", requireAdmin, async (req, res) => {
    try {
      console.log("Starting SAIF Zone document downloader...");
      
      // Import the SAIF Zone document downloader
      const { downloadSAIFZoneDocuments } = await import('../scraper/saif_zone_document_downloader.js');
      
      // Run the downloader
      const result = await downloadSAIFZoneDocuments();
      
      console.log("SAIF Zone document downloader completed successfully");
      res.json({ 
        success: true, 
        message: "SAIF Zone documents have been downloaded and saved",
        result
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error running SAIF Zone document downloader:", error);
      res.status(500).json({ 
        success: false, 
        message: `SAIF Zone document downloader failed: ${message}`
      });
    }
  });
  
  // Run SAIF Zone scraper (Admin only)
  app.post("/api/saif-zone/run-scraper", requireAdmin, async (req, res) => {
    try {
      console.log("Starting SAIF Zone scraper...");
      
      // Import the SAIF Zone scraper
      const { runSAIFZoneScraper } = await import('../scraper/saif_zone_scraper.js');
      
      // Run the scraper
      const result = await runSAIFZoneScraper();
      
      console.log("SAIF Zone scraper completed successfully");
      res.json({ 
        success: true, 
        message: "SAIF Zone data has been scraped and saved to the database",
        result
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error running SAIF Zone scraper:", error);
      res.status(500).json({ 
        success: false, 
        message: `SAIF Zone scraper failed: ${message}`
      });
    }
  });
  
  // Issues Log Endpoints
  
  // Create a new issue
  app.post("/api/issues", async (req, res) => {
    try {
      const userId = req.isAuthenticated() ? (req.user as any).id : null;
      
      const issue: InsertIssuesLog = {
        userId,
        type: req.body.type,
        severity: req.body.severity,
        message: req.body.message,
        stack_trace: req.body.stackTrace || req.body.stack_trace,
        url: req.body.url,
        user_agent: req.headers["user-agent"], // Changed from userAgent to user_agent to match schema
        component: req.body.component,
        action: req.body.action,
        metadata: req.body.metadata,
        resolved: false,
        createdAt: new Date(),
        resolvedAt: null
      };
      
      const createdIssue = await storage.createIssue(issue);
      console.log(`[IssueLog] New ${issue.type} issue logged: ${issue.message}`);
      
      res.status(201).json(createdIssue);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error creating issue log:", error);
      res.status(500).json({ message });
    }
  });
  
  // Get all issues (admin only)
  app.get("/api/issues", requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const issues = await storage.getRecentIssues(limit);
      res.json(issues);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching issues:", error);
      res.status(500).json({ message });
    }
  });
  
  // Get unresolved issues (admin only)
  app.get("/api/issues/unresolved", requireAdmin, async (req, res) => {
    try {
      const issues = await storage.getUnresolvedIssues();
      res.json(issues);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching unresolved issues:", error);
      res.status(500).json({ message });
    }
  });
  
  // Get issues for the current user
  app.get("/api/issues/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const issues = await storage.getIssuesByUser((req.user as any).id);
      res.json(issues);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching user issues:", error);
      res.status(500).json({ message });
    }
  });
  
  // Resolve an issue (admin only)
  app.patch("/api/issues/:id/resolve", requireAdmin, async (req, res) => {
    try {
      const issueId = parseInt(req.params.id);
      if (isNaN(issueId)) {
        return res.status(400).json({ message: "Invalid issue ID" });
      }
      
      await storage.resolveIssue(issueId);
      res.sendStatus(200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error resolving issue:", error);
      res.status(500).json({ message });
    }
  });

  // Web Research Assistant endpoints
  
  // Perform web research on a topic
  app.post("/api/web-research", async (req, res) => {
    try {
      // Verify OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key is not configured" });
      }

      const { topic } = req.body;
      
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ message: "Topic is required and must be a string" });
      }
      
      // Get user ID if authenticated
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      // Perform web research
      const research = await performWebResearch(topic, userId);
      
      res.json(research);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error performing web research:", error);
      res.status(500).json({ message });
    }
  });
  
  // Chat with web research assistant
  app.post("/api/web-research/chat", async (req, res) => {
    try {
      // Verify OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API key is not configured" });
      }

      const { topic, message, conversationId } = req.body;
      
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ message: "Topic is required and must be a string" });
      }
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required and must be a string" });
      }
      
      // Get user ID if authenticated
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      // Chat with web research assistant
      const response = await chatWithWebResearchAssistant(
        topic,
        message,
        conversationId ? parseInt(conversationId) : undefined,
        userId
      );
      
      res.json(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error chatting with web research assistant:", error);
      res.status(500).json({ message });
    }
  });
  
  // Create document from research
  app.post("/api/web-research/create-document", async (req, res) => {
    try {
      const { topic, summary, category } = req.body;
      
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ message: "Topic is required and must be a string" });
      }
      
      if (!summary || typeof summary !== 'string') {
        return res.status(400).json({ message: "Summary is required and must be a string" });
      }
      
      if (!category || typeof category !== 'string') {
        return res.status(400).json({ message: "Category is required and must be a string" });
      }
      
      // Get user ID if authenticated
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      
      // Create document from research
      const document = await createDocumentFromResearch(topic, summary, category, userId);
      
      res.json(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error creating document from research:", error);
      res.status(500).json({ message });
    }
  });
  
  // Search documents for a topic
  app.get("/api/web-research/search", async (req, res) => {
    try {
      const topic = req.query.topic as string;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic query parameter is required" });
      }
      
      // Search documents
      const results = await searchDocuments(topic);
      
      res.json(results);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error searching documents:", error);
      res.status(500).json({ message });
    }
  });

  // Register AI Product Manager routes
  registerAIProductManagerRoutes(app);

  const httpServer = createServer(app);
  
  // Create WebSocket server on a distinct path so it doesn't conflict with Vite's HMR
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Define extended WebSocket interface with userId property
  interface ExtendedWebSocket extends WebSocket {
    userId?: number;
  }

  // Declare global functions for TypeScript
  declare global {
    var broadcastWebSocketMessage: (message: any) => void;
    var sendUserWebSocketMessage: (userId: number, message: any) => void;
  }

  // Handle WebSocket connections
  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('WebSocket client connected');
    
    // Handle messages from clients
    ws.on('message', (message: any) => {
      try {
        // Parse the incoming message
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            // Send a pong response
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
            break;
            
          case 'notification_subscribe':
            // Store client subscription info (in a real implementation, you'd store this in a more permanent way)
            ws.userId = data.userId;
            console.log(`User ${data.userId} subscribed to notifications`);
            
            // Send confirmation
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ 
                type: 'subscription_confirmed', 
                message: 'You are now subscribed to real-time notifications' 
              }));
            }
            break;
            
          default:
            console.log(`Unhandled message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    // Send welcome message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'welcome', 
        message: 'Connected to UAE Business Setup Platform WebSocket Server',
        timestamp: Date.now()
      }));
    }
  });
  
  // Broadcast a message to all connected clients
  global.broadcastWebSocketMessage = (message: any) => {
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };
  
  // Broadcast a message to a specific user
  global.sendUserWebSocketMessage = (userId: number, message: any) => {
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        client.send(JSON.stringify(message));
      }
    });
  };
  
  // Helper function to create and send notifications
  const sendNotification = (
    title: string, 
    message: string, 
    options: { 
      type?: 'success' | 'info' | 'warning' | 'error',
      userId?: number // If provided, send only to this user
    } = {}
  ) => {
    const { type = 'info', userId } = options;
    
    const notificationData = {
      type: "notification",
      notification: {
        id: `notification-${Date.now()}`,
        type,
        title,
        message,
        timestamp: Date.now()
      }
    };
    
    if (userId) {
      global.sendUserWebSocketMessage(userId, notificationData);
    } else {
      global.broadcastWebSocketMessage(notificationData);
    }
    
    return notificationData.notification;
  };
  
  // Function to send system-wide notifications (admin announcements)
  const sendSystemNotification = (
    title: string, 
    message: string, 
    options: { 
      type?: 'success' | 'info' | 'warning' | 'error',
      severity?: 'low' | 'medium' | 'high',
      logToDatabase?: boolean,
    } = {}
  ) => {
    const { 
      type = 'info', 
      severity = type === 'error' ? 'high' : (type === 'warning' ? 'medium' : 'low'),
      logToDatabase = true 
    } = options;
    
    const notificationData = {
      type: "notification",
      notification: {
        id: `system-notification-${Date.now()}`,
        type,
        title: `[SYSTEM] ${title}`,
        message,
        timestamp: Date.now(),
        isSystem: true
      }
    };
    
    // Broadcast to all connected users
    global.broadcastWebSocketMessage(notificationData);
    
    // Optionally log to database (issues log)
    if (logToDatabase) {
      storage.createIssue({
        userId: null,
        type: 'system_notification',
        severity,
        message: `${title}: ${message}`,
        details: JSON.stringify(notificationData),
        resolved: false,
        createdAt: new Date(),
        resolvedAt: null,
        stackTrace: null
      }).catch(err => console.error('Failed to log system notification:', err));
    }
    
    return notificationData.notification;
  };
  
  // Test endpoint to send a notification to all users (requires admin)
  app.post("/api/test-notification", requireAdmin, (req, res) => {
    const { title, message, type = "info", userId } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }
    
    const notification = sendNotification(title, message, { 
      type: type as 'success' | 'info' | 'warning' | 'error',
      userId: userId ? parseInt(userId) : undefined
    });
    
    res.status(200).json({ success: true, notification });
  });
  
  // Endpoint for admins to send system-wide notifications
  app.post("/api/system-notification", requireAdmin, (req, res) => {
    const { title, message, type = "info", severity, logToDatabase = true } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }
    
    const notification = sendSystemNotification(title, message, { 
      type: type as 'success' | 'info' | 'warning' | 'error', 
      severity: severity as 'low' | 'medium' | 'high', 
      logToDatabase 
    });
    
    // Log the admin who sent this notification
    console.log(`System notification sent by admin (${req.user!.username}): ${title}`);
    
    res.status(200).json({ success: true, notification });
  });
  
  // Personal notification endpoint (authenticated users can only send to themselves)
  app.post("/api/notifications/self", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const { title, message, type = "info" } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }
    
    const notification = sendNotification(title, message, { 
      type: type as 'success' | 'info' | 'warning' | 'error',
      userId: req.user.id
    });
    
    res.status(200).json({ success: true, notification });
  });
  
  return httpServer;
}