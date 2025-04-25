/**
 * Document Fetcher Routes
 * 
 * This file contains routes for fetching and processing documents from free zone websites.
 */

import { Express, Request, Response } from "express";
import * as path from "path";
import * as fs from "fs";
import { spawn } from 'child_process';
import { db } from "./db";
import { sql } from "drizzle-orm";

// Middleware to check if user is admin
function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = req.user as any;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  next();
}

/**
 * Register document fetcher routes
 */
export function registerDocumentFetcherRoutes(app: Express) {
  /**
   * Fetch documents from a specific free zone website
   * Requires admin access
   */
  app.post("/api/documents/fetch-freezone-documents", requireAdmin, async (req, res) => {
    try {
      const { freeZoneId } = req.body;
      
      if (!freeZoneId) {
        return res.status(400).json({ message: "Free zone ID is required" });
      }
      
      // Check if free zone exists
      const freeZoneResult = await db.execute(
        sql`SELECT id, name, website FROM free_zones WHERE id = ${freeZoneId}`
      );
      
      if (!freeZoneResult.rows || freeZoneResult.rows.length === 0) {
        return res.status(404).json({ message: "Free zone not found" });
      }
      
      const freeZone = freeZoneResult.rows[0];
      
      if (!freeZone.website) {
        return res.status(400).json({ message: "Free zone has no website URL" });
      }
      
      const scriptPath = path.join(".", "run_freezone_document_fetcher.js");
      
      // Launch document fetching as a background process
      const child = spawn("node", [scriptPath, freeZoneId.toString()], {
        env: process.env,
        stdio: "pipe",
        detached: true // Allow the process to run independently
      });
      
      let stdoutChunks: any[] = [];
      let stderrChunks: any[] = [];
      
      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdoutChunks.push(chunk);
        console.log(`[freezone-fetcher] ${chunk}`);
      });
      
      child.stderr.on("data", (data) => {
        const chunk = data.toString();
        stderrChunks.push(chunk);
        console.error(`[freezone-fetcher-err] ${chunk}`);
      });
      
      // Respond immediately with process started message
      res.json({ 
        success: true, 
        message: `Document fetching started for ${freeZone.name}`,
        freeZoneId: freeZone.id,
        freeZoneName: freeZone.name,
        status: "running",
        processId: child.pid
      });
      
      // Allow the process to run in the background
      child.unref();
      
    } catch (error) {
      console.error("Error starting document fetcher:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error starting document fetcher", 
        error: error.message 
      });
    }
  });
  
  /**
   * Get document fetching status for a free zone
   * Checks if summary files exist and returns their content
   */
  app.get("/api/documents/fetch-freezone-status/:freeZoneId", requireAdmin, async (req, res) => {
    try {
      const freeZoneId = parseInt(req.params.freeZoneId);
      
      if (isNaN(freeZoneId)) {
        return res.status(400).json({ message: "Invalid free zone ID" });
      }
      
      // Get free zone details
      const freeZoneResult = await db.execute(
        sql`SELECT id, name FROM free_zones WHERE id = ${freeZoneId}`
      );
      
      if (!freeZoneResult.rows || freeZoneResult.rows.length === 0) {
        return res.status(404).json({ message: "Free zone not found" });
      }
      
      const freeZone = freeZoneResult.rows[0];
      const freeZoneDirName = freeZone.name.toLowerCase().replace(/\s+/g, '_');
      
      // Check for summary files
      const basePath = path.resolve('./freezone_docs');
      const freeZonePath = path.join(basePath, freeZoneDirName);
      const resultPath = path.join(basePath, 'results', `freezone_${freeZoneId}_result.json`);
      const summaryPath = path.join(freeZonePath, 'download_summary.json');
      
      const status = {
        freeZoneId,
        freeZoneName: freeZone.name,
        directoryExists: fs.existsSync(freeZonePath),
        hasSummary: fs.existsSync(summaryPath),
        hasResult: fs.existsSync(resultPath),
        summary: null,
        result: null,
        documentCount: 0
      };
      
      // Get document count from database
      const docCountResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM documents WHERE free_zone_id = ${freeZoneId}`
      );
      
      if (docCountResult.rows && docCountResult.rows.length > 0) {
        status.documentCount = parseInt(docCountResult.rows[0].count) || 0;
      }
      
      // Load summary if it exists
      if (status.hasSummary) {
        try {
          status.summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        } catch (e) {
          console.error(`Error reading summary file: ${e.message}`);
        }
      }
      
      // Load result if it exists
      if (status.hasResult) {
        try {
          status.result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
        } catch (e) {
          console.error(`Error reading result file: ${e.message}`);
        }
      }
      
      res.json(status);
      
    } catch (error) {
      console.error("Error checking document fetcher status:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error checking document fetcher status", 
        error: error.message 
      });
    }
  });
  
  /**
   * Fetch documents from all free zones with websites
   * Long-running process that runs in the background
   * Requires admin access
   */
  app.post("/api/documents/fetch-all-freezone-documents", requireAdmin, async (req, res) => {
    try {
      // Check if there are free zones with websites
      const freeZonesResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM free_zones WHERE website IS NOT NULL AND website != ''`
      );
      
      const freeZoneCount = parseInt(freeZonesResult.rows[0].count) || 0;
      
      if (freeZoneCount === 0) {
        return res.status(400).json({ message: "No free zones with websites found" });
      }
      
      const scriptPath = path.join(".", "run_freezone_document_fetcher.js");
      
      // Launch document fetching as a background process for all free zones
      const child = spawn("node", [scriptPath], {
        env: process.env,
        stdio: "pipe",
        detached: true // Allow the process to run independently
      });
      
      let stdoutChunks: any[] = [];
      let stderrChunks: any[] = [];
      
      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdoutChunks.push(chunk);
        console.log(`[freezone-all-fetcher] ${chunk}`);
      });
      
      child.stderr.on("data", (data) => {
        const chunk = data.toString();
        stderrChunks.push(chunk);
        console.error(`[freezone-all-fetcher-err] ${chunk}`);
      });
      
      // Respond immediately with process started message
      res.json({ 
        success: true, 
        message: `Document fetching started for all free zones (${freeZoneCount} with websites)`,
        freeZoneCount,
        status: "running",
        processId: child.pid
      });
      
      // Allow the process to run in the background
      child.unref();
      
    } catch (error) {
      console.error("Error starting document fetcher for all free zones:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error starting document fetcher for all free zones", 
        error: error.message 
      });
    }
  });
  
  /**
   * Get overall document fetching status for all free zones
   */
  app.get("/api/documents/fetch-all-freezone-status", requireAdmin, async (req, res) => {
    try {
      // Get list of free zones
      const freeZonesResult = await db.execute(
        sql`SELECT id, name FROM free_zones ORDER BY name`
      );
      
      if (!freeZonesResult.rows || freeZonesResult.rows.length === 0) {
        return res.status(404).json({ message: "No free zones found" });
      }
      
      // Check for overall summary file
      const basePath = path.resolve('./freezone_docs');
      const resultsDir = path.join(basePath, 'results');
      
      // Find the most recent all_freezones_result file
      let latestResultFile = null;
      if (fs.existsSync(resultsDir)) {
        const files = fs.readdirSync(resultsDir)
          .filter(file => file.startsWith('all_freezones_result_'))
          .sort()
          .reverse();
          
        if (files.length > 0) {
          latestResultFile = path.join(resultsDir, files[0]);
        }
      }
      
      // Get document counts for all free zones
      const docCountsResult = await db.execute(
        sql`SELECT free_zone_id, COUNT(*) as count 
            FROM documents 
            GROUP BY free_zone_id`
      );
      
      // Create mapping of free zone ID to document count
      const docCounts: Record<string, number> = {};
      if (docCountsResult.rows) {
        docCountsResult.rows.forEach((row: any) => {
          docCounts[row.free_zone_id] = parseInt(row.count) || 0;
        });
      }
      
      // Build status object
      const status = {
        totalFreeZones: freeZonesResult.rows.length,
        freeZones: freeZonesResult.rows.map((freeZone: any) => ({
          id: freeZone.id,
          name: freeZone.name,
          documentCount: docCounts[freeZone.id] || 0
        })),
        hasOverallResult: !!latestResultFile,
        overallResult: null,
        totalDocuments: Object.values(docCounts).reduce((sum, count) => sum + count, 0)
      };
      
      // Load overall result if it exists
      if (latestResultFile) {
        try {
          status.overallResult = JSON.parse(fs.readFileSync(latestResultFile, 'utf8'));
        } catch (e) {
          console.error(`Error reading overall result file: ${e.message}`);
        }
      }
      
      res.json(status);
      
    } catch (error) {
      console.error("Error checking overall document fetcher status:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error checking overall document fetcher status", 
        error: error.message 
      });
    }
  });
}