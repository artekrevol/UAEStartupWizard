import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import * as path from "path";
import * as fs from "fs";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getBusinessRecommendations, generateDocumentRequirements, getUAEBusinessAssistantResponse } from "./openai";
import { BusinessSetup, InsertDocument } from "@shared/schema";
import { calculateBusinessScore } from "./scoring";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { businessCategories, businessActivities, freeZones, establishmentGuides, documents } from "@shared/schema";
import { documentUpload, processUploadedDocument, processDMCCDocuments } from "./document-upload";

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
          sql`${businessActivities.industryGroup} ILIKE ${'%' + keyword + '%'}`
        );
        
        // Combine with OR
        query = query.where(sql`${conditions.join(' OR ')}`);
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
              ${businessActivities.activityCode} ILIKE ${'%' + searchQuery + '%'}`
        );
      }
      
      if (industryGroup) {
        query = query.where(
          sql`${businessActivities.industryGroup} ILIKE ${'%' + industryGroup + '%'}`
        );
      }
      
      // Get count for pagination
      const countQuery = db.select({ count: sql`count(*)` }).from(businessActivities);
      
      // Apply the same filters to count query
      if (searchQuery) {
        countQuery.where(
          sql`${businessActivities.name} ILIKE ${'%' + searchQuery + '%'} OR 
              ${businessActivities.activityCode} ILIKE ${'%' + searchQuery + '%'}`
        );
      }
      
      if (industryGroup) {
        countQuery.where(
          sql`${businessActivities.industryGroup} ILIKE ${'%' + industryGroup + '%'}`
        );
      }
      
      const [countResult] = await countQuery;
      const totalCount = Number(countResult?.count || 0);
      
      // Get the activities with pagination
      const activities = await query
        .limit(limit)
        .offset(offset)
        .orderBy(businessActivities.name);
      
      // Return with pagination metadata
      res.json({
        activities,
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
      await storage.updateBusinessSetup(parseInt(req.params.id), req.body);
      res.sendStatus(200);
    } catch (error: unknown) {
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

  // Endpoint to get all free zones
  app.get("/api/free-zones", async (req, res) => {
    try {
      const allFreeZones = await db.select().from(freeZones);
      res.json(allFreeZones);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching free zones:", error);
      res.status(500).json({ message });
    }
  });

  // Endpoint to get a specific free zone by ID
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

  // Document management routes
  
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
      const freeZoneId = req.query.freeZoneId ? parseInt(req.query.freeZoneId as string) : undefined;
      
      if (freeZoneId && !isNaN(freeZoneId)) {
        const documents = await storage.getDocumentsByFreeZone(freeZoneId);
        return res.json(documents);
      } else if (category) {
        const documents = await storage.getDocumentsByCategory(category);
        return res.json(documents);
      } else {
        // Get all documents - consider adding pagination here
        const allDocuments = await db.execute(sql`SELECT * FROM documents LIMIT 100`);
        return res.json(allDocuments.rows || []);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error fetching documents:", error);
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
  app.post("/api/documents/upload", documentUpload.single('file'), processUploadedDocument, async (req: Request, res: Response) => {
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
      res.status(201).json(document);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error uploading document:", error);
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
      
      await storage.updateDocument(id, req.body);
      res.sendStatus(200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error updating document:", error);
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
      
      await storage.deleteDocument(id);
      res.sendStatus(204);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error("Error deleting document:", error);
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
  

  
  const httpServer = createServer(app);
  return httpServer;
}