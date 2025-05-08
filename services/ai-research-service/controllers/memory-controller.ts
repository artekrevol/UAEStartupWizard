/**
 * Memory Controller
 * 
 * Handles requests related to the assistant's memory functionality.
 */

import { Request, Response } from 'express';
import { AiService } from '../services/ai-service';

export class MemoryController {
  private aiService: AiService;
  
  constructor(aiService: AiService) {
    this.aiService = aiService;
    
    // Bind methods to ensure 'this' context
    this.initializeMemory = this.initializeMemory.bind(this);
    this.updateMemory = this.updateMemory.bind(this);
  }
  
  /**
   * Initialize assistant memory
   */
  async initializeMemory(req: Request, res: Response) {
    try {
      const result = await this.aiService.initializeAssistantMemory();
      res.json({ success: true, message: 'Assistant memory initialized', ...result });
    } catch (error: any) {
      console.error("Error initializing assistant memory:", error);
      res.status(500).json({ message: error.message || 'Unknown error occurred' });
    }
  }
  
  /**
   * Update assistant memory
   */
  async updateMemory(req: Request, res: Response) {
    try {
      const { data } = req.body;
      
      if (!data) {
        return res.status(400).json({ message: "Data is required" });
      }
      
      const result = await this.aiService.updateAssistantMemory(data);
      res.json({ success: true, message: 'Assistant memory updated', ...result });
    } catch (error: any) {
      console.error("Error updating assistant memory:", error);
      res.status(500).json({ message: error.message || 'Unknown error occurred' });
    }
  }
}