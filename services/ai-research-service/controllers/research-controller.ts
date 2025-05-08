/**
 * Research Controller
 * 
 * Handles requests related to research functionality, including web research
 * and document analysis.
 */

import { Request, Response } from 'express';
import { AiService } from '../services/ai-service';
import { WebResearchService } from '../services/web-research-service';

export class ResearchController {
  private aiService: AiService;
  private webResearchService: WebResearchService;
  
  constructor(aiService: AiService, webResearchService: WebResearchService) {
    this.aiService = aiService;
    this.webResearchService = webResearchService;
    
    // Bind methods to ensure 'this' context
    this.performResearch = this.performResearch.bind(this);
    this.getResearchById = this.getResearchById.bind(this);
    this.performWebResearch = this.performWebResearch.bind(this);
    this.chatWithWebResearchAssistant = this.chatWithWebResearchAssistant.bind(this);
    this.handleResearchRequest = this.handleResearchRequest.bind(this);
    this.handleWebResearchRequest = this.handleWebResearchRequest.bind(this);
  }
  
  /**
   * Perform research on a given topic
   */
  async performResearch(req: Request, res: Response) {
    try {
      const { topic } = req.body;
      
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ message: "Topic is required and must be a string" });
      }
      
      // Get user ID if authenticated
      const userId = (req as any).isAuthenticated ? (req as any).user?.id : undefined;
      
      const research = await this.aiService.performResearch(topic, userId);
      
      res.json(research);
    } catch (error: any) {
      console.error("Error performing research:", error);
      res.status(500).json({ message: error.message || 'Unknown error occurred' });
    }
  }
  
  /**
   * Get research by ID
   */
  async getResearchById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: "Research ID is required" });
      }
      
      const research = await this.aiService.getResearchById(parseInt(id));
      
      if (!research) {
        return res.status(404).json({ message: "Research not found" });
      }
      
      res.json(research);
    } catch (error: any) {
      console.error("Error getting research:", error);
      res.status(500).json({ message: error.message || 'Unknown error occurred' });
    }
  }
  
  /**
   * Perform web research
   */
  async performWebResearch(req: Request, res: Response) {
    try {
      const { topic } = req.body;
      
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ message: "Topic is required and must be a string" });
      }
      
      // Get user ID if authenticated
      const userId = (req as any).isAuthenticated ? (req as any).user?.id : undefined;
      
      const research = await this.webResearchService.performWebResearch(topic, userId);
      
      res.json(research);
    } catch (error: any) {
      console.error("Error performing web research:", error);
      res.status(500).json({ message: error.message || 'Unknown error occurred' });
    }
  }
  
  /**
   * Chat with web research assistant
   */
  async chatWithWebResearchAssistant(req: Request, res: Response) {
    try {
      const { topic, message, conversationId } = req.body;
      
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ message: "Topic is required and must be a string" });
      }
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required and must be a string" });
      }
      
      // Get user ID if authenticated
      const userId = (req as any).isAuthenticated ? (req as any).user?.id : undefined;
      
      const response = await this.webResearchService.chatWithWebResearchAssistant(
        topic,
        message,
        conversationId ? parseInt(conversationId) : undefined,
        userId
      );
      
      res.json(response);
    } catch (error: any) {
      console.error("Error chatting with web research assistant:", error);
      res.status(500).json({ message: error.message || 'Unknown error occurred' });
    }
  }
  
  /**
   * Handle research request from message bus
   */
  async handleResearchRequest(data: any) {
    const { topic, userId } = data;
    return await this.aiService.performResearch(topic, userId);
  }
  
  /**
   * Handle web research request from message bus
   */
  async handleWebResearchRequest(data: any) {
    const { topic, userId } = data;
    return await this.webResearchService.performWebResearch(topic, userId);
  }
}