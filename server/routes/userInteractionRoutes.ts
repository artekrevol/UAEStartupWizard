/**
 * API Routes for User Interaction Tracking
 * 
 * These routes provide endpoints for both capturing user interactions
 * from the client and retrieving interaction data for admin reporting.
 */

import { Router } from 'express';
import { 
  recordUserInteraction, 
  getUserInteractions, 
  getUserInteractionStats,
  deleteOldUserInteractions
} from '../services/userInteractionService';
import { insertUserInteractionSchema } from '@shared/schema';
import { z } from 'zod';

// Admin middleware for protected routes
import { isAdmin } from '../middleware/authMiddleware';

const router = Router();

/**
 * Record a user interaction from the client
 * POST /api/user-interactions
 */
router.post('/', async (req, res) => {
  try {
    // Validate the interaction data
    const validatedData = insertUserInteractionSchema.parse(req.body);
    
    // Add user info if authenticated
    if (req.isAuthenticated()) {
      validatedData.userId = req.user.id;
      validatedData.username = req.user.username;
    }
    
    // Add metadata from the request
    validatedData.sessionId = req.sessionID || null;
    validatedData.userAgent = req.headers['user-agent'] || null;
    validatedData.ipAddress = req.ip || req.socket.remoteAddress || null;
    
    // Record the interaction
    const interaction = await recordUserInteraction(validatedData);
    
    res.status(201).json(interaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid interaction data', details: error.format() });
    } else {
      console.error('Error recording user interaction:', error);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  }
});

/**
 * Get user interactions (admin only)
 * GET /api/user-interactions
 */
router.get('/', isAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    
    // Extract filter parameters
    const filters: any = {};
    
    if (req.query.userId) {
      filters.userId = Number(req.query.userId);
    }
    
    if (req.query.username) {
      filters.username = req.query.username as string;
    }
    
    if (req.query.interactionType) {
      filters.interactionType = req.query.interactionType as string;
    }
    
    if (req.query.pageUrl) {
      filters.pageUrl = req.query.pageUrl as string;
    }
    
    if (req.query.fromDate) {
      filters.fromDate = new Date(req.query.fromDate as string);
    }
    
    if (req.query.toDate) {
      filters.toDate = new Date(req.query.toDate as string);
    }
    
    const result = await getUserInteractions(page, limit, filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching user interactions:', error);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

/**
 * Get user interaction statistics (admin only)
 * GET /api/user-interactions/stats
 */
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const timeframe = (req.query.timeframe as any) || 'day';
    
    // Extract filter parameters
    const filters: any = {};
    
    if (req.query.userId) {
      filters.userId = Number(req.query.userId);
    }
    
    if (req.query.interactionType) {
      filters.interactionType = req.query.interactionType as string;
    }
    
    if (req.query.fromDate) {
      filters.fromDate = new Date(req.query.fromDate as string);
    }
    
    if (req.query.toDate) {
      filters.toDate = new Date(req.query.toDate as string);
    }
    
    const stats = await getUserInteractionStats(timeframe, filters);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user interaction statistics:', error);
    res.status(500).json({ error: 'Failed to fetch interaction statistics' });
  }
});

/**
 * Delete old user interactions (admin only)
 * DELETE /api/user-interactions/old
 */
router.delete('/old', isAdmin, async (req, res) => {
  try {
    // Default to 90 days if not specified
    const daysToKeep = Number(req.query.daysToKeep) || 90;
    
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await deleteOldUserInteractions(cutoffDate);
    res.json(result);
  } catch (error) {
    console.error('Error deleting old user interactions:', error);
    res.status(500).json({ error: 'Failed to delete old interactions' });
  }
});

export default router;