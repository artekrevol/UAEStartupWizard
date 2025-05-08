/**
 * OpenAI API Key Check Middleware
 * 
 * This middleware verifies that the OpenAI API key is configured 
 * before allowing access to AI-dependent endpoints.
 */

import { Request, Response, NextFunction } from 'express';

export function checkOpenAIKey(req: Request, res: Response, next: NextFunction) {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: "OpenAI API key is not configured",
      message: "This endpoint requires OpenAI API services but the API key is not available"
    });
  }
  
  next();
}