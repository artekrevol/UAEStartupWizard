/**
 * Web Research Assistant
 * 
 * This component is responsible for executing web research tasks,
 * analyzing search results, and providing structured information from various sources.
 */

import OpenAI from "openai";
import { storage } from "./storage";
import axios from "axios";
import { db } from "./db";
import { documents, conversations, freeZones } from "../shared/schema";
import { eq, and, like, or, sql } from "drizzle-orm";

// Initialize OpenAI with API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Maximum number of results to return from database
const MAX_RESULTS = 5;

/**
 * Search for relevant documents in the database
 * @param query The search query
 * @param category Optional category filter
 * @param freeZoneId Optional free zone ID filter
 * @returns Array of matching documents
 */
export async function searchDocuments(
  query: string,
  category?: string,
  freeZoneId?: number
): Promise<any[]> {
  try {
    console.log(`Searching documents for: "${query}"`);
    
    // Create a safe search pattern based on the query
    const searchPattern = `%${query.replace(/\s+/g, '%')}%`;
    
    // Start with a base query using Drizzle ORM
    let dbQuery = db
      .select()
      .from(documents)
      .where(
        or(
          sql`LOWER(${documents.title}) LIKE LOWER(${searchPattern})`,
          sql`LOWER(${documents.content}) LIKE LOWER(${searchPattern})`
        )
      );
    
    // Add category filter if provided
    if (category) {
      dbQuery = dbQuery.where(eq(documents.category, category));
    }
    
    // Add free zone filter if provided
    if (freeZoneId !== undefined) {
      dbQuery = dbQuery.where(eq(documents.freeZoneId, freeZoneId));
    }
    
    // Execute query with limit
    const results = await dbQuery.limit(MAX_RESULTS);
    
    console.log(`Found ${results.length} matching documents`);
    return results;
  } catch (error) {
    console.error("Error searching documents:", error);
    return [];
  }
}

/**
 * Search for free zones matching query
 * @param query The search query
 * @returns Array of matching free zones
 */
export async function searchFreeZones(query: string): Promise<any[]> {
  try {
    console.log(`Searching free zones for: "${query}"`);
    
    // Create a safe search pattern based on the query
    const searchPattern = `%${query.replace(/\s+/g, '%')}%`;
    
    // Use Drizzle ORM for the query
    const results = await db
      .select()
      .from(freeZones)
      .where(
        or(
          sql`LOWER(${freeZones.name}) LIKE LOWER(${searchPattern})`,
          sql`LOWER(${freeZones.description}) LIKE LOWER(${searchPattern})`
        )
      )
      .limit(MAX_RESULTS);
    
    console.log(`Found ${results.length} matching free zones`);
    return results;
  } catch (error) {
    console.error("Error searching free zones:", error);
    return [];
  }
}

/**
 * Perform online research using a search API
 * @param query The search query
 * @returns Object containing search results
 */
export async function performWebResearch(query: string): Promise<any> {
  try {
    console.log(`Performing web research for: "${query}"`);
    
    // First check if we have relevant documents in our database
    const documents = await searchDocuments(query);
    
    if (documents.length > 0) {
      // If we have relevant documents, use those instead of making external queries
      console.log("Using internal documents for research");
      return {
        source: "internal",
        results: documents.map(doc => ({
          title: doc.title,
          content: doc.content?.substring(0, 500) || "No content available",
          category: doc.category,
          url: doc.id ? `/api/documents/${doc.id}` : null
        }))
      };
    }
    
    // If this is a free zone query, check our free zones data
    if (query.toLowerCase().includes("free zone") || 
        query.toLowerCase().includes("freezone") || 
        query.toLowerCase().includes("zone")) {
      const freeZoneResults = await searchFreeZones(query);
      
      if (freeZoneResults.length > 0) {
        return {
          source: "free_zones",
          results: freeZoneResults.map(zone => ({
            name: zone.name,
            description: zone.description,
            location: zone.location,
            benefits: zone.benefits
          }))
        };
      }
    }
    
    // For now, return empty results rather than performing external web searches
    // This can be expanded later to include actual web search functionality
    console.log("No relevant internal data found");
    return {
      source: "web",
      results: []
    };
  } catch (error) {
    console.error("Error in web research:", error);
    return {
      source: "error",
      results: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Answer a business-related question using available knowledge
 * @param question The user's question
 * @returns Answer based on available knowledge
 */
export async function answerBusinessQuestion(question: string): Promise<string> {
  try {
    console.log(`Answering business question: "${question}"`);
    
    // Generate system message
    const systemMessage = `
You are an expert UAE business setup assistant with comprehensive knowledge of free zones, 
business activities, license types, and compliance requirements.

Your task is to answer the user's question about UAE business formation clearly and accurately.
If you don't know the answer, acknowledge that and suggest where they might find the information.

Provide step-by-step guidance when explaining procedures, and cite specific requirements where relevant.
Keep your response concise and focus on actionable information.
`;
    
    // Research relevant information
    const researchResults = await performWebResearch(question);
    
    // Format research results as context
    let context = "";
    if (researchResults.results && researchResults.results.length > 0) {
      context = "Based on the following information:\n\n";
      
      researchResults.results.forEach((result: any, index: number) => {
        if (researchResults.source === "internal") {
          context += `Document ${index + 1}: ${result.title}\n`;
          context += `${result.content}\n\n`;
        } else if (researchResults.source === "free_zones") {
          context += `Free Zone: ${result.name}\n`;
          context += `Description: ${result.description || "No description available"}\n`;
          context += `Location: ${result.location || "UAE"}\n`;
          if (result.benefits && result.benefits.length > 0) {
            context += `Benefits: ${result.benefits.join(", ")}\n`;
          }
          context += "\n";
        }
      });
    }
    
    // Call OpenAI API
    console.log("Calling OpenAI for business question answer");
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: `${context ? context + "\n" : ""}Please answer this question: ${question}` }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    // Extract and return the answer
    const answer = response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    return answer;
  } catch (error) {
    console.error("Error answering business question:", error);
    return "I'm sorry, I encountered an error while researching your question. Please try again later.";
  }
}

/**
 * Functions for premium agent features
 */

/**
 * Get comprehensive knowledge about a specific free zone
 * @param freeZoneName Name of the free zone
 * @returns Detailed information about the free zone
 */
export async function getFreeZoneKnowledge(freeZoneName: string): Promise<any> {
  try {
    console.log(`Getting comprehensive knowledge about: ${freeZoneName}`);
    
    // Find the free zone in the database using Drizzle ORM
    const searchPattern = `%${freeZoneName.replace(/\s+/g, '%')}%`;
    
    const freeZoneResults = await db
      .select()
      .from(freeZones)
      .where(sql`LOWER(${freeZones.name}) LIKE LOWER(${searchPattern})`)
      .limit(1);
    
    if (freeZoneResults.length === 0) {
      console.log(`Free zone not found: ${freeZoneName}`);
      return { found: false };
    }
    
    const freeZone = freeZoneResults[0];
    
    // Find related documents
    // Convert id to number if it's not already
    const freeZoneId = typeof freeZone.id === 'number' ? freeZone.id : parseInt(freeZone.id as string, 10);
    const relatedDocs = await searchDocuments(freeZoneName, undefined, freeZoneId);
    
    // Compile information
    return {
      found: true,
      freeZone: {
        id: freeZone.id,
        name: freeZone.name,
        description: freeZone.description,
        location: freeZone.location,
        benefits: freeZone.benefits,
        industries: freeZone.industries,
        requirements: freeZone.requirements,
        additionalInfo: freeZone.additionalInfo
      },
      relatedDocuments: relatedDocs.map(doc => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        preview: doc.content?.substring(0, 200) || "No content available"
      })),
      documentCount: relatedDocs.length
    };
  } catch (error) {
    console.error("Error getting free zone knowledge:", error);
    return { found: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Premium agent function to answer complex business questions
 * @param question The user's question
 * @returns Comprehensive answer with insights
 */
export async function premiumBusinessAnswer(question: string): Promise<any> {
  try {
    console.log("Using premium agent to answer:", question);
    
    // Begin with research to gather information
    const researchResults = await performWebResearch(question);
    
    // Generate an expert response using all available information
    const answer = await answerBusinessQuestion(question);
    
    // Return formatted response with insights
    return {
      answer,
      sources: researchResults.results.length,
      sourceType: researchResults.source,
      confidence: "high" // This could be dynamically calculated in the future
    };
  } catch (error) {
    console.error("Error in premium business answer:", error);
    return {
      answer: "I encountered an error while processing your question. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}