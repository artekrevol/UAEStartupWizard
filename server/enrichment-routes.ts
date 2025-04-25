/**
 * Document Enrichment API Routes
 * 
 * These routes provide an interface to the document enrichment functionality,
 * allowing enrichment processes to be run through the platform UI.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { exec } from 'child_process';
import util from 'util';
import { freeZones } from '../shared/schema';

// Define type for free zone data
type FreeZoneData = {
  id: number;
  name: string;
  completeness_score?: number;
};

const execPromise = util.promisify(exec);
const router = express.Router();

// Type definition for session with user
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      isAdmin: boolean;
    };
  }
}

// Middleware to check admin authorization
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ 
      error: 'Unauthorized: This action requires admin privileges'
    });
  }
};

// Get list of available free zones for enrichment
router.get('/api/enrichment/free-zones', requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(
      sql`SELECT id, name, website, logo_url, completeness_score
          FROM free_zones 
          ORDER BY name ASC`
    );
    
    const freeZones = result.rows || [];
    res.json(freeZones);
  } catch (error) {
    console.error('Error retrieving free zones:', error);
    res.status(500).json({ error: 'Failed to retrieve free zones' });
  }
});

// Get enrichment status for a free zone
router.get('/api/enrichment/status/:freeZoneId', requireAdmin, async (req, res) => {
  try {
    const freeZoneId = parseInt(req.params.freeZoneId);
    
    if (isNaN(freeZoneId)) {
      return res.status(400).json({ error: 'Invalid free zone ID' });
    }
    
    // Get the free zone details
    const freeZoneResult = await db.execute(
      sql`SELECT id, name, completeness_score FROM free_zones WHERE id = ${freeZoneId}`
    );
    
    if (!freeZoneResult.rows || freeZoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Free zone not found' });
    }
    
    // Define type for free zone data
    type FreeZoneData = {
      id: number;
      name: string;
      completeness_score?: number;
    };
    
    // Type assertion for free zone
    const freeZone = freeZoneResult.rows[0] as FreeZoneData;
    
    // Get document counts by category
    const documentResult = await db.execute(
      sql`SELECT category, COUNT(*) as count 
          FROM documents 
          WHERE free_zone_id = ${freeZoneId}
          GROUP BY category`
    );
    
    const documentCounts: Record<string, number> = {};
    let totalDocuments = 0;
    
    if (documentResult.rows) {
      documentResult.rows.forEach(row => {
        if (row && typeof row === 'object' && 'category' in row && 'count' in row) {
          const category = String(row.category);
          const count = parseInt(String(row.count));
          documentCounts[category] = count;
          totalDocuments += count;
        }
      });
    }
    
    // Check if any enrichment is in progress
    const auditPath = path.join('freezone_docs', freeZone.name.toLowerCase().replace(/\s+/g, '_'), 'audit_results.json');
    const hasAuditData = fs.existsSync(auditPath);
    
    let auditData = null;
    if (hasAuditData) {
      try {
        auditData = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      } catch (e) {
        console.error('Error reading audit data:', e);
      }
    }
    
    res.json({
      freeZone,
      documentCounts,
      totalDocuments,
      hasAuditData,
      auditData,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error retrieving enrichment status:', error);
    res.status(500).json({ error: 'Failed to retrieve enrichment status' });
  }
});

// Run a single enrichment cycle for a free zone
router.post('/api/enrichment/run-cycle/:freeZoneId', requireAdmin, async (req, res) => {
  try {
    const freeZoneId = parseInt(req.params.freeZoneId);
    
    if (isNaN(freeZoneId)) {
      return res.status(400).json({ error: 'Invalid free zone ID' });
    }
    
    // Get the free zone details
    const freeZoneResult = await db.execute(
      sql`SELECT id, name FROM free_zones WHERE id = ${freeZoneId}`
    );
    
    if (!freeZoneResult.rows || freeZoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Free zone not found' });
    }
    
    const freeZone = freeZoneResult.rows[0] as FreeZoneData;
    const freeZoneName = freeZone.name.toLowerCase().replace(/\s+/g, '_');
    
    // Start enrichment cycle process 
    // Right now only supports Ajman Free Zone (hardcoded)
    if (freeZoneId === 9) { // Ajman Free Zone
      // Return immediate response and run process in background
      res.json({ 
        status: 'started', 
        message: `Started enrichment cycle for ${freeZone.name}`,
        freeZoneId,
        freeZoneName: freeZone.name
      });
      
      // Run the process in the background
      try {
        const { stdout, stderr } = await execPromise('node run-single-enrichment-cycle.js');
        console.log('Enrichment cycle completed:', stdout);
        if (stderr) {
          console.error('Enrichment cycle errors:', stderr);
        }
        
        // Update free zone completeness score in database
        // Read the latest audit results
        const auditPath = path.join('freezone_docs', freeZoneName, 'audit_results.json');
        if (fs.existsSync(auditPath)) {
          const auditData = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
          if (auditData && auditData.completenessScore) {
            // Update the completeness score in the database
            await db.execute(
              sql`UPDATE free_zones 
                  SET completeness_score = ${auditData.completenessScore},
                      updated_at = NOW()
                  WHERE id = ${freeZoneId}`
            );
          }
        }
      } catch (error) {
        console.error('Error running enrichment cycle:', error);
      }
    } else {
      res.status(400).json({ 
        error: 'Unsupported free zone',
        message: `Enrichment process is currently only supported for Ajman Free Zone (ID: 9)`
      });
    }
  } catch (error) {
    console.error('Error running enrichment cycle:', error);
    res.status(500).json({ error: 'Failed to run enrichment cycle' });
  }
});

// Run full enrichment process until completion
router.post('/api/enrichment/run-complete/:freeZoneId', requireAdmin, async (req, res) => {
  try {
    const freeZoneId = parseInt(req.params.freeZoneId);
    
    if (isNaN(freeZoneId)) {
      return res.status(400).json({ error: 'Invalid free zone ID' });
    }
    
    // Get the free zone details
    const freeZoneResult = await db.execute(
      sql`SELECT id, name FROM free_zones WHERE id = ${freeZoneId}`
    );
    
    if (!freeZoneResult.rows || freeZoneResult.rows.length === 0) {
      return res.status(404).json({ error: 'Free zone not found' });
    }
    
    const freeZone = freeZoneResult.rows[0] as FreeZoneData;
    
    // Start complete enrichment process
    // Right now only supports Ajman Free Zone (hardcoded)
    if (freeZoneId === 9) { // Ajman Free Zone
      // Return immediate response and run process in background
      res.json({ 
        status: 'started', 
        message: `Started complete enrichment for ${freeZone.name}`,
        freeZoneId,
        freeZoneName: freeZone.name
      });
      
      // Run the process in the background
      try {
        exec('node complete-freezone-enrichment.js', (error, stdout, stderr) => {
          if (error) {
            console.error('Error running complete enrichment:', error);
            return;
          }
          console.log('Complete enrichment process finished:', stdout);
          if (stderr) {
            console.error('Complete enrichment errors:', stderr);
          }
          
          // Update free zone completeness score in database
          // Using inner function for async DB operation inside exec callback
          const updateCompleteness = async () => {
            try {
              // Make a copy of the freezone name to keep it in this closure
              const freeZoneName = String(freeZone.name).toLowerCase().replace(/\s+/g, '_');
              const auditPath = path.join('freezone_docs', freeZoneName, 'audit_results.json');
              if (fs.existsSync(auditPath)) {
                const auditData = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
                if (auditData && auditData.completenessScore) {
                  // Update the completeness score in the database
                  await db.execute(
                    sql`UPDATE free_zones 
                        SET completeness_score = ${auditData.completenessScore},
                            updated_at = NOW()
                        WHERE id = ${freeZoneId}`
                  );
                }
              }
            } catch (err) {
              console.error('Error updating completeness score:', err);
            }
          };
          
          updateCompleteness();
        });
      } catch (error) {
        console.error('Error starting complete enrichment process:', error);
      }
    } else {
      res.status(400).json({ 
        error: 'Unsupported free zone',
        message: `Enrichment process is currently only supported for Ajman Free Zone (ID: 9)`
      });
    }
  } catch (error) {
    console.error('Error running complete enrichment:', error);
    res.status(500).json({ error: 'Failed to run complete enrichment' });
  }
});

export default router;