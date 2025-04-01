import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getBusinessRecommendations, generateDocumentRequirements, getUAEBusinessAssistantResponse } from "./openai";
import { BusinessSetup } from "@shared/schema";
import { calculateBusinessScore } from "./scoring";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { businessCategories, businessActivities, freeZones, establishmentGuides } from "@shared/schema";

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

      const activities = await db
        .select()
        .from(businessActivities)
        .where(eq(businessActivities.categoryId, categoryId));

      console.log("Found activities:", activities);

      if (!activities.length) {
        return res.status(404).json({ message: "No activities found for this category" });
      }

      res.json(activities);
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

  const httpServer = createServer(app);
  return httpServer;
}