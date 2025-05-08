/**
 * Register AI Product Manager Routes
 * This file registers all routes for the AI Product Manager module
 */

import type { Express } from "express";
import aiProductManagerRoutes from "./routes";

export function registerAIProductManagerRoutes(app: Express) {
  app.use('/api/ai-pm', aiProductManagerRoutes);
}