import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getBusinessRecommendations, generateDocumentRequirements } from "./openai";
import { BusinessSetup } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

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
        freeZone: recommendations.freeZone,
        requirements: recommendations.requirements,
        documents,
        status: "pending"
      };

      const setup = await storage.createBusinessSetup(setupData);
      await storage.updateUserProgress(req.user!.id, 25);
      console.log("Created business setup:", setup);
      res.json(setup);
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