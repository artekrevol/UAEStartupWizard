import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getBusinessRecommendations, generateDocumentRequirements } from "./openai";
import { BusinessSetup } from "@shared/schema";
import { calculateBusinessScore } from "./scoring";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { businessCategories, businessActivities } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}