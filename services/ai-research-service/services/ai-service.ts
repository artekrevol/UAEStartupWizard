/**
 * AI Service
 * 
 * Core service that handles all AI-related functionality using OpenAI.
 */

import OpenAI from 'openai';
import axios from 'axios';
import { db } from '../../../server/db';
import { freeZones, documents, businessActivities, conversations } from '../../../shared/schema';
import { eq, and, like, or, sql } from 'drizzle-orm';
import { getCommunicator } from '../../../shared/communication/service-communicator';

// Research status enum
export enum ResearchStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export class AiService {
  private openai: OpenAI;
  private communicator = getCommunicator('ai-research-service');
  
  constructor(openai: OpenAI) {
    this.openai = openai;
  }
  
  /**
   * Perform research on a given topic
   */
  async performResearch(topic: string, userId?: number) {
    console.log(`[AiService] Performing research on topic: ${topic}`);
    
    try {
      // Create research record
      const research = {
        id: Math.floor(Math.random() * 1000000),
        topic,
        userId,
        status: ResearchStatus.IN_PROGRESS,
        createdAt: new Date()
      };
      
      // Get context data
      const freeZoneData = await this.getFreeZoneContext();
      const documentData = await this.getDocumentContext();
      
      // Perform AI research using OpenAI
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "system",
            content: `You are a business setup assistant specializing in UAE free zones. Provide accurate and helpful information about establishing businesses in UAE.
            
Here is information about UAE free zones:
${JSON.stringify(freeZoneData)}

Here is information about business establishment guides:
${JSON.stringify(documentData)}

Always provide detailed, accurate responses based on the above context. If the information is not in the context, say so clearly.`
          },
          {
            role: "user",
            content: `Research the following topic about UAE business setup: ${topic}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });
      
      // Format research results
      const result = {
        ...research,
        status: ResearchStatus.COMPLETED,
        result: response.choices[0].message.content,
        completedAt: new Date()
      };
      
      return result;
    } catch (error) {
      console.error(`[AiService] Error performing research:`, error);
      throw new Error(`Failed to perform research: ${error.message}`);
    }
  }
  
  /**
   * Get research by ID
   */
  async getResearchById(id: number) {
    // In a real implementation, this would fetch from the database
    // For now, we'll return a mock response
    return {
      id,
      topic: "Mock research topic",
      status: ResearchStatus.COMPLETED,
      result: "This is a mock research result",
      createdAt: new Date(),
      completedAt: new Date()
    };
  }
  
  /**
   * Business assistant query
   */
  async businessAssistantQuery(
    query: string, 
    userId?: number, 
    freeZoneIds?: number[], 
    guideIds?: number[],
    userBusinessContext?: any
  ) {
    console.log(`[AiService] Processing business assistant query: ${query}`);
    
    try {
      // Retrieve free zone data
      let freeZoneData;
      if (freeZoneIds && Array.isArray(freeZoneIds) && freeZoneIds.length > 0) {
        // If specific free zone IDs are provided, retrieve only those
        freeZoneData = await db
          .select()
          .from(freeZones)
          .where(sql`${freeZones.id} IN (${freeZoneIds.join(',')})`);
      } else {
        // Otherwise, get all free zones to provide context
        freeZoneData = await db
          .select()
          .from(freeZones);
      }

      // Retrieve document data
      let documentData;
      if (guideIds && Array.isArray(guideIds) && guideIds.length > 0) {
        // If specific guide IDs are provided, retrieve only those
        documentData = await db
          .select()
          .from(documents)
          .where(sql`${documents.id} IN (${guideIds.join(',')})`);
      } else {
        // Otherwise, get relevant documents based on query terms
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 3);
        
        if (searchTerms.length > 0) {
          const likeConditions = searchTerms.map(term =>
            or(
              like(documents.title, `%${term}%`),
              like(documents.content, `%${term}%`),
              like(documents.category, `%${term}%`)
            )
          );
          
          documentData = await db
            .select()
            .from(documents)
            .where(and(...likeConditions))
            .limit(10);
        } else {
          // If no relevant search terms, get basic setup guides
          documentData = await db
            .select()
            .from(documents)
            .where(
              or(
                like(documents.category, '%setup%'),
                like(documents.category, '%guide%'),
                like(documents.category, '%establish%')
              )
            )
            .limit(10);
        }
      }

      // Format context data
      const contextText = freeZoneData.map((fz: any) => 
        `Free Zone: ${fz.name}
Description: ${fz.description || 'No description available'}
Location: ${fz.location || 'N/A'}
Industries: ${fz.industries || 'Various industries'}
Website: ${fz.websiteUrl || 'N/A'}
${fz.benefits ? `Benefits: ${fz.benefits}` : ''}
`).join('\n\n');

      const documentContextText = documentData.map((doc: any) => 
        `Title: ${doc.title || 'Untitled Document'}
Category: ${doc.category || 'Uncategorized'}
${doc.subcategory ? `Subcategory: ${doc.subcategory}` : ''}
Content: ${doc.content?.substring(0, 1000) || 'No content available'}
`).join('\n\n');

      // Format business context if available
      const businessContextText = userBusinessContext ? 
        `User's Business Context:
Type: ${userBusinessContext.businessType || 'Not specified'}
Free Zone: ${userBusinessContext.freeZone || 'Not specified'}
Industry: ${userBusinessContext.industry || 'Not specified'}
` : '';

      // Create the OpenAI completion request
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
You are an expert UAE business setup assistant, specialized in helping entrepreneurs establish businesses in the UAE.
Use the context information to provide accurate, helpful, and actionable responses to inquiries about business setup in the UAE.
You should always use official and up-to-date information about UAE business processes.
When answering, cite relevant sources from the provided context.

Here is information about UAE free zones and business establishment guides to inform your responses:
${contextText}

${documentContextText}

${businessContextText}

Respond in a professional, helpful manner. Always prioritize accuracy and be specific where possible. 
If you're unsure about any information not contained in the context, acknowledge the limitations and suggest 
where the user might find more details.

Always respond with JSON in the following format:
{
  "answer": "Your detailed response here...",
  "sources": [
    {
      "title": "Source title",
      "relevance": "Brief explanation of why this source is relevant to the query"
    }
  ]
}
`
          },
          {
            role: "user",
            content: query
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      try {
        // Parse the JSON response
        const jsonResponse = JSON.parse(content);
        return jsonResponse;
      } catch (parseError) {
        console.error("Error parsing OpenAI response as JSON:", parseError);
        // Fallback for non-JSON responses
        return {
          answer: content,
          sources: []
        };
      }
    } catch (error) {
      console.error(`[AiService] Error in business assistant query:`, error);
      throw new Error(`Failed to process business assistant query: ${error.message}`);
    }
  }
  
  /**
   * Get user's business context from database
   */
  async getUserBusinessContext(userId: number) {
    try {
      // In a real implementation, this would fetch from the database
      // For this example, we'll try to query a mock storage or return null
      return null;
    } catch (error) {
      console.error(`[AiService] Error getting user business context:`, error);
      return null;
    }
  }
  
  /**
   * Quick test query for the business assistant
   */
  async quickTestQuery(message: string, userId?: number) {
    try {
      // Perform a simplified query for testing
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a UAE business setup assistant. Provide a brief response to the user's query."
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      return {
        conversationId: userId ? 123 : Math.floor(Math.random() * 1000),
        message: response.choices[0].message.content,
        memory: {
          key_topics: ["UAE business setup", "Free zones"],
          next_steps: ["Research more options", "Contact free zone authorities"],
          business_setup_info: {
            recommended_zones: "Depends on business type"
          }
        }
      };
    } catch (error) {
      console.error(`[AiService] Error in quick test query:`, error);
      throw new Error(`Failed to process quick test query: ${error.message}`);
    }
  }
  
  /**
   * Initialize assistant memory
   */
  async initializeAssistantMemory() {
    console.log(`[AiService] Initializing assistant memory`);
    
    try {
      // Get free zone data
      const freeZonesData = await db.select().from(freeZones);
      
      // Get activity data
      const activitiesData = await db.select().from(businessActivities);
      
      // Get document data
      const documentsData = await db.select().from(documents).limit(100);
      
      return {
        freeZones: freeZonesData.length,
        activities: activitiesData.length,
        documents: documentsData.length
      };
    } catch (error) {
      console.error(`[AiService] Error initializing assistant memory:`, error);
      throw new Error(`Failed to initialize assistant memory: ${error.message}`);
    }
  }
  
  /**
   * Update assistant memory
   */
  async updateAssistantMemory(data: any) {
    console.log(`[AiService] Updating assistant memory`);
    
    try {
      // In a real implementation, this would update the assistant's memory
      return {
        updated: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[AiService] Error updating assistant memory:`, error);
      throw new Error(`Failed to update assistant memory: ${error.message}`);
    }
  }
  
  /**
   * Get free zone context data for AI queries
   */
  private async getFreeZoneContext() {
    try {
      return await db
        .select()
        .from(freeZones)
        .limit(20);
    } catch (error) {
      console.error(`[AiService] Error getting free zone context:`, error);
      return [];
    }
  }
  
  /**
   * Get document context data for AI queries
   */
  private async getDocumentContext() {
    try {
      return await db
        .select()
        .from(documents)
        .where(
          or(
            like(documents.category, '%setup%'),
            like(documents.category, '%guide%'),
            like(documents.category, '%establish%')
          )
        )
        .limit(20);
    } catch (error) {
      console.error(`[AiService] Error getting document context:`, error);
      return [];
    }
  }
}