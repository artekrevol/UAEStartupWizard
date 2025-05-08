/**
 * Web Research Service
 * 
 * Handles web research functionality, including searching the web and
 * extracting relevant information for business setup in UAE.
 */

import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../../../server/db';
import { documents, freeZones, conversations } from '../../../shared/schema';
import { eq, and, like, or, sql } from 'drizzle-orm';
import { getCommunicator } from '../../../shared/communication/service-communicator';

export class WebResearchService {
  private openai: OpenAI;
  private communicator = getCommunicator('ai-research-service');
  
  // Maximum number of results to return from database
  private MAX_RESULTS = 5;
  
  constructor(openai: OpenAI) {
    this.openai = openai;
  }
  
  /**
   * Perform web research on a given topic
   */
  async performWebResearch(topic: string, userId?: number) {
    console.log(`[WebResearchService] Performing web research on topic: ${topic}`);
    
    try {
      // First, search our internal database
      const internalResults = await this.searchInternalData(topic);
      
      // Then, prepare to search the web if needed
      let webResults = [];
      let aiSummary = '';
      
      // Only perform web search if internal results are insufficient
      if (internalResults.freeZones.length < 2 && internalResults.documents.length < 3) {
        // In a production environment, we would use real web search results
        // Instead, we'll simulate web research with GPT
        webResults = await this.simulateWebSearch(topic);
        
        // Use AI to summarize the research
        aiSummary = await this.summarizeResearch(topic, internalResults, webResults);
      } else {
        // If we have enough internal data, just summarize that
        aiSummary = await this.summarizeInternalData(topic, internalResults);
      }
      
      // Create conversation if userId is provided
      let conversationId;
      if (userId) {
        conversationId = await this.createConversation(userId, topic);
      }
      
      // Return combined results
      return {
        topic,
        conversationId,
        internalResults,
        webResults,
        summary: aiSummary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[WebResearchService] Error performing web research:`, error);
      throw new Error(`Failed to perform web research: ${error.message}`);
    }
  }
  
  /**
   * Chat with the web research assistant
   */
  async chatWithWebResearchAssistant(
    topic: string, 
    message: string, 
    conversationId?: number, 
    userId?: number
  ) {
    console.log(`[WebResearchService] Chat with web research assistant: ${message}`);
    
    try {
      // Get conversation history if conversationId is provided
      let conversationHistory = [];
      if (conversationId) {
        conversationHistory = await this.getConversationHistory(conversationId);
      } else if (userId) {
        // Create new conversation
        conversationId = await this.createConversation(userId, topic);
        conversationHistory = [];
      }
      
      // Search for relevant data
      const searchResults = await this.searchInternalData(topic);
      
      // Prepare context for the AI
      const context = this.prepareContextFromSearchResults(searchResults);
      
      // Create messages for OpenAI
      const messages = [
        {
          role: "system",
          content: `You are a web research assistant specializing in UAE business setup. 
Use the provided context to answer questions about establishing businesses in UAE free zones.
The following context contains information from our database:

${context}

Always provide helpful, accurate answers based on this context. If you don't know something or 
it's not in the context, say so clearly rather than making up information.`
        },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: "user",
          content: message
        }
      ];
      
      // Generate response using OpenAI
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });
      
      // Get AI response
      const aiResponse = response.choices[0].message.content;
      
      // Save to conversation history if we have a conversation ID
      if (conversationId) {
        await this.saveToConversationHistory(conversationId, 'user', message);
        await this.saveToConversationHistory(conversationId, 'assistant', aiResponse);
      }
      
      // Return response
      return {
        conversationId,
        topic,
        message: aiResponse,
        sources: this.extractSourcesFromSearchResults(searchResults)
      };
    } catch (error) {
      console.error(`[WebResearchService] Error in chat with web research assistant:`, error);
      throw new Error(`Failed to chat with web research assistant: ${error.message}`);
    }
  }
  
  /**
   * Search internal database for relevant data
   */
  private async searchInternalData(topic: string) {
    console.log(`[WebResearchService] Searching internal data for: ${topic}`);
    
    // Extract search terms from topic
    const terms = topic.toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 3);
    
    // Search for free zones
    const freeZoneResults = await this.searchFreeZones(topic);
    
    // Search for documents
    const documentResults = await this.searchDocuments(topic);
    
    return {
      freeZones: freeZoneResults,
      documents: documentResults
    };
  }
  
  /**
   * Search for free zones matching the query
   */
  private async searchFreeZones(query: string) {
    try {
      const terms = query.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 3);
      
      if (terms.length === 0) {
        // If no meaningful terms, return popular free zones
        return await db
          .select()
          .from(freeZones)
          .limit(this.MAX_RESULTS);
      }
      
      // Build OR conditions for each term
      const conditions = terms.map(term => 
        or(
          like(freeZones.name, `%${term}%`),
          like(freeZones.description, `%${term}%`),
          like(freeZones.industries, `%${term}%`)
        )
      );
      
      return await db
        .select()
        .from(freeZones)
        .where(and(...conditions))
        .limit(this.MAX_RESULTS);
    } catch (error) {
      console.error('[WebResearchService] Error searching free zones:', error);
      return [];
    }
  }
  
  /**
   * Search for documents matching the query
   */
  private async searchDocuments(query: string) {
    try {
      const terms = query.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 3);
      
      if (terms.length === 0) {
        // If no meaningful terms, return general setup guides
        return await db
          .select()
          .from(documents)
          .where(
            or(
              like(documents.category, '%setup%'),
              like(documents.category, '%guide%')
            )
          )
          .limit(this.MAX_RESULTS);
      }
      
      // Build OR conditions for each term
      const conditions = terms.map(term => 
        or(
          like(documents.title, `%${term}%`),
          like(documents.content, `%${term}%`),
          like(documents.category, `%${term}%`),
          like(documents.subcategory, `%${term}%`)
        )
      );
      
      return await db
        .select()
        .from(documents)
        .where(and(...conditions))
        .limit(this.MAX_RESULTS);
    } catch (error) {
      console.error('[WebResearchService] Error searching documents:', error);
      return [];
    }
  }
  
  /**
   * Simulate web search (in production, this would use a real search API)
   */
  private async simulateWebSearch(topic: string) {
    console.log(`[WebResearchService] Simulating web search for: ${topic}`);
    
    try {
      // In a production environment, we would use a real search API or web scraping
      // For now, we'll generate simulated search results using GPT
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a web search simulator for UAE business setup topics. 
Generate 3-5 realistic search results for the given topic. 
Each result should include a title, URL, and a brief description/snippet. 
Make the results realistic and focused on authentic UAE business setup information sources.`
          },
          {
            role: "user",
            content: `Generate search results for: ${topic}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });
      
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI for web search simulation");
      }
      
      try {
        // Parse JSON response
        const results = JSON.parse(content);
        return Array.isArray(results.results) ? results.results : [];
      } catch (parseError) {
        console.error("Error parsing web search results:", parseError);
        return [];
      }
    } catch (error) {
      console.error(`[WebResearchService] Error simulating web search:`, error);
      return [];
    }
  }
  
  /**
   * Summarize research using AI
   */
  private async summarizeResearch(topic: string, internalResults: any, webResults: any[]) {
    console.log(`[WebResearchService] Summarizing research for: ${topic}`);
    
    try {
      // Prepare context from results
      const context = this.prepareContextForSummary(internalResults, webResults);
      
      // Generate summary using OpenAI
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a business research expert specializing in UAE business setup.
Summarize the following research results about UAE business setup into a comprehensive, 
well-structured summary. Focus on providing actionable information.

${context}`
          },
          {
            role: "user",
            content: `Provide a comprehensive summary of the research on: ${topic}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      
      return response.choices[0].message.content || 'No summary available';
    } catch (error) {
      console.error(`[WebResearchService] Error summarizing research:`, error);
      return 'Error generating research summary.';
    }
  }
  
  /**
   * Summarize internal data using AI
   */
  private async summarizeInternalData(topic: string, internalResults: any) {
    console.log(`[WebResearchService] Summarizing internal data for: ${topic}`);
    
    try {
      // Prepare context from internal results
      const context = this.prepareContextFromSearchResults(internalResults);
      
      // Generate summary using OpenAI
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a business research expert specializing in UAE business setup.
Summarize the following information about UAE business setup into a comprehensive, 
well-structured summary. Focus on providing accurate and actionable information.

${context}`
          },
          {
            role: "user",
            content: `Provide a comprehensive summary of the information on: ${topic}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      
      return response.choices[0].message.content || 'No summary available';
    } catch (error) {
      console.error(`[WebResearchService] Error summarizing internal data:`, error);
      return 'Error generating data summary.';
    }
  }
  
  /**
   * Prepare context from search results
   */
  private prepareContextFromSearchResults(searchResults: any) {
    let context = '';
    
    // Add free zone information
    if (searchResults.freeZones && searchResults.freeZones.length > 0) {
      context += '--- FREE ZONE INFORMATION ---\n\n';
      
      searchResults.freeZones.forEach((fz: any, index: number) => {
        context += `[FZ-${index + 1}] ${fz.name}\n`;
        if (fz.description) context += `Description: ${fz.description}\n`;
        if (fz.location) context += `Location: ${fz.location}\n`;
        if (fz.industries) context += `Industries: ${fz.industries}\n`;
        if (fz.benefits) context += `Benefits: ${fz.benefits}\n`;
        if (fz.websiteUrl) context += `Website: ${fz.websiteUrl}\n`;
        context += '\n';
      });
    }
    
    // Add document information
    if (searchResults.documents && searchResults.documents.length > 0) {
      context += '--- DOCUMENT INFORMATION ---\n\n';
      
      searchResults.documents.forEach((doc: any, index: number) => {
        context += `[DOC-${index + 1}] ${doc.title || 'Untitled'}\n`;
        if (doc.category) context += `Category: ${doc.category}\n`;
        if (doc.subcategory) context += `Subcategory: ${doc.subcategory}\n`;
        if (doc.content) {
          // Truncate content to a reasonable length
          const truncatedContent = doc.content.length > 500 
            ? doc.content.substring(0, 500) + '...' 
            : doc.content;
          context += `Content: ${truncatedContent}\n`;
        }
        context += '\n';
      });
    }
    
    return context;
  }
  
  /**
   * Prepare context for summarization
   */
  private prepareContextForSummary(internalResults: any, webResults: any[]) {
    let context = this.prepareContextFromSearchResults(internalResults);
    
    // Add web search results
    if (webResults && webResults.length > 0) {
      context += '--- WEB SEARCH RESULTS ---\n\n';
      
      webResults.forEach((result: any, index: number) => {
        context += `[WEB-${index + 1}] ${result.title || 'Untitled'}\n`;
        if (result.url) context += `URL: ${result.url}\n`;
        if (result.snippet || result.description) {
          context += `Description: ${result.snippet || result.description}\n`;
        }
        context += '\n';
      });
    }
    
    return context;
  }
  
  /**
   * Extract sources from search results for citation
   */
  private extractSourcesFromSearchResults(searchResults: any) {
    const sources = [];
    
    // Add free zone sources
    if (searchResults.freeZones && searchResults.freeZones.length > 0) {
      searchResults.freeZones.forEach((fz: any, index: number) => {
        sources.push({
          id: `FZ-${index + 1}`,
          title: fz.name,
          type: 'free-zone',
          url: fz.websiteUrl || null
        });
      });
    }
    
    // Add document sources
    if (searchResults.documents && searchResults.documents.length > 0) {
      searchResults.documents.forEach((doc: any, index: number) => {
        sources.push({
          id: `DOC-${index + 1}`,
          title: doc.title || 'Untitled Document',
          type: 'document',
          category: doc.category || null,
          subcategory: doc.subcategory || null
        });
      });
    }
    
    return sources;
  }
  
  /**
   * Create a new conversation
   */
  private async createConversation(userId: number, topic: string) {
    try {
      // In a real implementation, we would insert into the database
      // For now, we'll return a mock conversation ID
      return Math.floor(Math.random() * 1000);
    } catch (error) {
      console.error('[WebResearchService] Error creating conversation:', error);
      throw error;
    }
  }
  
  /**
   * Get conversation history
   */
  private async getConversationHistory(conversationId: number) {
    try {
      // In a real implementation, we would fetch from the database
      // For now, we'll return an empty array
      return [];
    } catch (error) {
      console.error('[WebResearchService] Error getting conversation history:', error);
      return [];
    }
  }
  
  /**
   * Save message to conversation history
   */
  private async saveToConversationHistory(conversationId: number, role: string, content: string) {
    try {
      // In a real implementation, we would insert into the database
      console.log(`[WebResearchService] Saving ${role} message to conversation ${conversationId}`);
      return true;
    } catch (error) {
      console.error('[WebResearchService] Error saving to conversation history:', error);
      return false;
    }
  }
}