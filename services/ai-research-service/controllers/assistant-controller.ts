/**
 * Assistant Controller
 * 
 * Handles requests related to the business assistant functionality.
 */

import { Request, Response } from 'express';
import { AiService } from '../services/ai-service';
import { findBestStaticResponse } from '../utils/static-responses';

export class AssistantController {
  private aiService: AiService;
  
  constructor(aiService: AiService) {
    this.aiService = aiService;
    
    // Bind methods to ensure 'this' context
    this.businessAssistantQuery = this.businessAssistantQuery.bind(this);
    this.quickTest = this.quickTest.bind(this);
    this.handleBusinessAssistantQuery = this.handleBusinessAssistantQuery.bind(this);
  }
  
  /**
   * Handle business assistant query
   */
  async businessAssistantQuery(req: Request, res: Response) {
    try {
      const { query, freeZoneIds, guideIds } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required and must be a string" });
      }

      console.log("Business assistant query:", query);

      // Get user ID if authenticated
      const userId = (req as any).isAuthenticated ? (req as any).user?.id : undefined;
      let userBusinessContext;
      
      if (userId) {
        userBusinessContext = await this.aiService.getUserBusinessContext(userId);
      }

      const response = await this.aiService.businessAssistantQuery(
        query, 
        userId, 
        freeZoneIds, 
        guideIds, 
        userBusinessContext
      );
      
      res.json(response);
    } catch (error: any) {
      console.error("Error in business assistant query:", error);
      res.status(500).json({ message: error.message || 'Unknown error occurred' });
    }
  }
  
  /**
   * Quick test endpoint for business assistant
   */
  async quickTest(req: Request, res: Response) {
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
      
      // Get user ID if authenticated
      const userId = (req as any).isAuthenticated ? (req as any).user?.id : undefined;
      
      // If we don't have a static response, use the AI service
      const response = await this.aiService.quickTestQuery(message, userId);
      
      res.json(response);
    } catch (error: any) {
      console.error("Error in quick test:", error);
      res.status(500).json({ error: error.message || 'Unknown error occurred' });
    }
  }
  
  /**
   * Handle business assistant query from message bus
   */
  async handleBusinessAssistantQuery(data: any) {
    const { query, userId, freeZoneIds, guideIds, userBusinessContext } = data;
    return await this.aiService.businessAssistantQuery(
      query, 
      userId, 
      freeZoneIds, 
      guideIds, 
      userBusinessContext
    );
  }
}