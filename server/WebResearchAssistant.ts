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
    
    // Extract any free zone names mentioned in the query
    const freeZoneNames = extractFreeZoneNames(query);
    let freeZoneId: number | undefined = undefined;
    
    // If specific free zones are mentioned, prioritize documents from those zones
    if (freeZoneNames.length > 0) {
      console.log(`Detected free zone names in query: ${freeZoneNames.join(', ')}`);
      
      // Try to find the free zone by name
      for (const name of freeZoneNames) {
        const freeZoneResults = await db
          .select()
          .from(freeZones)
          .where(sql`LOWER(${freeZones.name}) LIKE LOWER(${'%' + name + '%'})`)
          .limit(1);
        
        if (freeZoneResults.length > 0) {
          freeZoneId = freeZoneResults[0].id;
          console.log(`Matched query to free zone ID ${freeZoneId} (${freeZoneResults[0].name})`);
          break;
        }
      }
    }
    
    // Try to identify the category from the query
    const categoryMatch = identifyDocumentCategory(query);
    
    // First check if we have relevant documents in our database
    const documents = await searchDocuments(query, categoryMatch, freeZoneId);
    
    // If we have enough documents, use those instead of making external queries
    if (documents.length > 0) {
      console.log(`Using ${documents.length} internal documents for research`);
      
      // Create a more comprehensive response with document metadata
      const enhancedResults = documents.map(doc => {
        // Extract the most relevant content snippet
        const contentSnippet = extractRelevantSnippet(doc.content || "", query, 800);
        
        return {
          title: doc.title,
          content: contentSnippet,
          fullContent: doc.content,
          category: doc.category,
          subcategory: doc.subcategory,
          freeZoneId: doc.freeZoneId,
          documentType: doc.documentType,
          lastUpdated: doc.updatedAt || doc.createdAt,
          url: doc.id ? `/api/documents/${doc.id}` : null,
          confidence: calculateRelevanceScore(query, doc.title, contentSnippet)
        };
      });
      
      // Sort by relevance score
      enhancedResults.sort((a, b) => b.confidence - a.confidence);
      
      return {
        source: "internal",
        results: enhancedResults,
        query: query,
        matchedCategory: categoryMatch,
        matchedFreeZone: freeZoneId
      };
    }
    
    // If this is a free zone query, check all our free zones data comprehensively
    const isFreeZoneQuery = query.toLowerCase().includes("free zone") || 
        query.toLowerCase().includes("freezone") || 
        query.toLowerCase().includes("zone") ||
        freeZoneNames.length > 0;
        
    if (isFreeZoneQuery) {
      // If we already have a specific free zone ID, fetch complete details for it
      if (freeZoneId) {
        const freeZoneDetail = await getFreeZoneDetailedInfo(freeZoneId);
        
        if (freeZoneDetail) {
          console.log(`Found detailed free zone information for ID ${freeZoneId}`);
          return {
            source: "free_zone_detail",
            results: [freeZoneDetail],
            query: query
          };
        }
      }
      
      // Otherwise search across all free zones
      const freeZoneResults = await searchFreeZones(query);
      
      if (freeZoneResults.length > 0) {
        console.log(`Found ${freeZoneResults.length} matching free zones`);
        
        // Create enhanced results with all available fields
        const enhancedResults = await Promise.all(freeZoneResults.map(async (zone) => {
          // Get document count for this free zone
          const docCount = await countDocumentsForFreeZone(zone.id);
          
          return {
            id: zone.id,
            name: zone.name,
            description: zone.description || "",
            location: zone.location || "",
            website: zone.website || "",
            benefits: formatBenefitsList(zone.benefits),
            industries: formatIndustriesList(zone.industries),
            setupProcess: zone.setupProcess || "",
            legalRequirements: zone.legalRequirements || "",
            feeStructure: zone.feeStructure || "",
            licenseTypes: formatLicenseTypes(zone.licenseTypes),
            visaInformation: zone.visaInformation || "",
            facilities: formatFacilitiesList(zone.facilities),
            documentCount: docCount,
            confidence: calculateFreeZoneRelevance(query, zone)
          };
        }));
        
        // Sort by relevance score
        enhancedResults.sort((a, b) => b.confidence - a.confidence);
        
        return {
          source: "free_zones",
          results: enhancedResults,
          query: query
        };
      }
    }
    
    // For now, return empty results rather than performing external web searches
    // This can be expanded later to include actual web search functionality
    console.log("No relevant internal data found");
    return {
      source: "web",
      results: [],
      query: query
    };
  } catch (error) {
    console.error("Error in web research:", error);
    return {
      source: "error",
      results: [],
      error: error instanceof Error ? error.message : "Unknown error",
      query: query
    };
  }
}

/**
 * Extract relevant content snippet based on query
 */
function extractRelevantSnippet(content: string, query: string, maxLength: number = 800): string {
  if (!content) return "No content available";
  
  // Normalize content and query
  const normalizedContent = content.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  
  // Split query into keywords (removing common words)
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'is', 'are'];
  const keywords = normalizedQuery
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  // Find the best paragraph containing most keywords
  const paragraphs = content.split(/\n\n+/);
  let bestParagraph = "";
  let bestScore = -1;
  
  paragraphs.forEach(paragraph => {
    if (paragraph.length < 20) return; // Skip very short paragraphs
    
    const normalizedParagraph = paragraph.toLowerCase();
    let score = 0;
    
    // Score based on keyword matches
    keywords.forEach(keyword => {
      if (normalizedParagraph.includes(keyword)) {
        score += 1;
      }
    });
    
    // Prioritize paragraphs with exact query matches
    if (normalizedParagraph.includes(normalizedQuery)) {
      score += 5;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestParagraph = paragraph;
    }
  });
  
  // If no good paragraph found, return the beginning of the content
  if (bestScore <= 0) {
    return content.substring(0, maxLength) + (content.length > maxLength ? "..." : "");
  }
  
  // If selected paragraph is too short, combine with neighboring paragraphs
  if (bestParagraph.length < maxLength / 2 && paragraphs.length > 1) {
    const bestIndex = paragraphs.indexOf(bestParagraph);
    if (bestIndex >= 0) {
      let finalContent = bestParagraph;
      
      // Add previous paragraph if available
      if (bestIndex > 0) {
        finalContent = paragraphs[bestIndex - 1] + "\n\n" + finalContent;
      }
      
      // Add next paragraph if available
      if (bestIndex < paragraphs.length - 1) {
        finalContent = finalContent + "\n\n" + paragraphs[bestIndex + 1];
      }
      
      bestParagraph = finalContent;
    }
  }
  
  // Truncate if too long
  return bestParagraph.substring(0, maxLength) + (bestParagraph.length > maxLength ? "..." : "");
}

/**
 * Calculate relevance score between query and document
 */
function calculateRelevanceScore(query: string, title: string, content: string): number {
  const normalizedQuery = query.toLowerCase();
  const normalizedTitle = (title || "").toLowerCase();
  const normalizedContent = (content || "").toLowerCase();
  
  let score = 0;
  
  // Title match is weighted heavily
  if (normalizedTitle.includes(normalizedQuery)) {
    score += 5;
  }
  
  // Split query into keywords
  const keywords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
  
  // Check for keyword matches in title and content
  keywords.forEach(keyword => {
    if (normalizedTitle.includes(keyword)) {
      score += 1;
    }
    if (normalizedContent.includes(keyword)) {
      score += 0.5;
    }
  });
  
  // Normalize score between 0 and 1
  return Math.min(score / 10, 1);
}

/**
 * Calculate free zone relevance to query
 */
function calculateFreeZoneRelevance(query: string, freeZone: any): number {
  const normalizedQuery = query.toLowerCase();
  let score = 0;
  
  // Check name match
  if ((freeZone.name || "").toLowerCase().includes(normalizedQuery)) {
    score += 5;
  }
  
  // Check description match
  if ((freeZone.description || "").toLowerCase().includes(normalizedQuery)) {
    score += 3;
  }
  
  // Check other fields
  const fieldsToCheck = [
    'location', 'benefits', 'industries', 'setupProcess', 
    'legalRequirements', 'feeStructure', 'licenseTypes', 
    'visaInformation', 'facilities'
  ];
  
  fieldsToCheck.forEach(field => {
    if (freeZone[field] && String(freeZone[field]).toLowerCase().includes(normalizedQuery)) {
      score += 2;
    }
  });
  
  // Check for specific business terms in query
  const businessTerms = [
    'license', 'business', 'setup', 'company', 'incorporation', 
    'cost', 'fee', 'visa', 'residence'
  ];
  
  businessTerms.forEach(term => {
    if (normalizedQuery.includes(term)) {
      score += 1;
    }
  });
  
  // Normalize score between 0 and 1
  return Math.min(score / 15, 1);
}

/**
 * Format benefits list for better readability
 */
function formatBenefitsList(benefits: string | null): string[] {
  if (!benefits) return [];
  
  // Handle array JSON format
  if (benefits.startsWith('[')) {
    try {
      return JSON.parse(benefits);
    } catch (e) {
      // Fall through to text processing if JSON parsing fails
    }
  }
  
  // Process as text with bullet points or numbering
  return benefits
    .split(/\n|•|\*|\d+\.|✓|✔|→|-/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Format industries list for better readability
 */
function formatIndustriesList(industries: string | null): string[] {
  if (!industries) return [];
  
  // Handle array JSON format
  if (industries.startsWith('[')) {
    try {
      return JSON.parse(industries);
    } catch (e) {
      // Fall through to text processing if JSON parsing fails
    }
  }
  
  // Process as text with bullet points or numbering
  return industries
    .split(/\n|•|\*|\d+\.|✓|✔|→|-/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Format license types for better readability
 */
function formatLicenseTypes(licenseTypes: string | null): any[] {
  if (!licenseTypes) return [];
  
  // Handle JSON format
  if (licenseTypes.startsWith('[') || licenseTypes.startsWith('{')) {
    try {
      return JSON.parse(licenseTypes);
    } catch (e) {
      // Fall through to text processing if JSON parsing fails
    }
  }
  
  // Process as text
  const licenses = licenseTypes
    .split(/\n|•|\*|\d+\.|✓|✔|→|-/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
    
  return licenses.map(license => {
    // Try to extract name and description
    const parts = license.split(/:\s*|–\s*|-\s*/);
    if (parts.length > 1) {
      return {
        name: parts[0].trim(),
        description: parts.slice(1).join(' ').trim()
      };
    }
    return { name: license, description: '' };
  });
}

/**
 * Format facilities list for better readability
 */
function formatFacilitiesList(facilities: string | null): string[] {
  if (!facilities) return [];
  
  // Handle JSON format
  if (facilities.startsWith('[')) {
    try {
      return JSON.parse(facilities);
    } catch (e) {
      // Fall through to text processing if JSON parsing fails
    }
  }
  
  // Process as text with bullet points or numbering
  return facilities
    .split(/\n|•|\*|\d+\.|✓|✔|→|-/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Extract free zone names from query
 */
function extractFreeZoneNames(query: string): string[] {
  // Common free zone names and abbreviations
  const knownFreeZones = [
    'dmcc', 'dubai multi commodities centre',
    'jafza', 'jebel ali free zone',
    'dafza', 'dubai airport free zone',
    'difc', 'dubai international financial centre',
    'saif zone', 'sharjah airport international free zone',
    'hamriyah', 'hamriyah free zone',
    'rakez', 'ras al khaimah economic zone',
    'fujairah', 'creative city', 'dubai south',
    'dubai healthcare city', 'dhcc',
    'dubai internet city', 'dic',
    'dubai media city', 'dmc',
    'dubai knowledge park', 'dubai design district',
    'twofour54', 'abu dhabi global market', 'adgm',
    'kizad', 'khalifa industrial zone'
  ];
  
  const queryLower = query.toLowerCase();
  const foundZones = [];
  
  // Check for known free zone names
  for (const zone of knownFreeZones) {
    if (queryLower.includes(zone)) {
      foundZones.push(zone);
    }
  }
  
  // Look for patterns like "X Free Zone" or "X FZ"
  const regex = /([a-z\s]+)(free zone|fz|freezone)/gi;
  let match;
  while ((match = regex.exec(query)) !== null) {
    if (match[1].trim()) {
      foundZones.push(match[1].trim());
    }
  }
  
  return [...new Set(foundZones)]; // Remove duplicates
}

/**
 * Identify relevant document category from query
 */
function identifyDocumentCategory(query: string): string | undefined {
  const queryLower = query.toLowerCase();
  
  const categoryPatterns = {
    'business_setup': ['setup', 'start', 'open', 'establish', 'form', 'incorporate', 'formation', 'register'],
    'compliance': ['comply', 'compliance', 'regulation', 'legal', 'law', 'requirement'],
    'financial': ['finance', 'financial', 'bank', 'banking', 'account', 'tax', 'vat', 'payment'],
    'legal': ['legal', 'law', 'contract', 'agreement', 'dispute', 'arbitration', 'court'],
    'visa': ['visa', 'residence', 'permit', 'immigration', 'sponsor', 'family'],
    'trade': ['trade', 'import', 'export', 'customs', 'shipping', 'logistics'],
    'license': ['license', 'permit', 'activity', 'business activity', 'commercial', 'trading'],
  };
  
  let bestCategory;
  let highestScore = 0;
  
  // Score each category based on matching terms
  for (const [category, terms] of Object.entries(categoryPatterns)) {
    const score = terms.filter(term => queryLower.includes(term)).length;
    if (score > highestScore) {
      highestScore = score;
      bestCategory = category;
    }
  }
  
  return highestScore > 0 ? bestCategory : undefined;
}

/**
 * Get comprehensive details for a specific free zone
 */
async function getFreeZoneDetailedInfo(freeZoneId: number): Promise<any> {
  try {
    // Get the free zone basic information
    const freeZoneBasic = await db
      .select()
      .from(freeZones)
      .where(eq(freeZones.id, freeZoneId))
      .limit(1);
    
    if (!freeZoneBasic || freeZoneBasic.length === 0) {
      return null;
    }
    
    const freeZone = freeZoneBasic[0];
    
    // Get document counts by category for this free zone
    const documentCounts = await db.execute(sql`
      SELECT category, COUNT(*) as count
      FROM ${documents}
      WHERE free_zone_id = ${freeZoneId}
      GROUP BY category
    `);
    
    // Prepare document categories structure
    const docCategories: Record<string, number> = {};
    documentCounts.forEach((row: any) => {
      if (row.category && row.count) {
        docCategories[row.category] = Number(row.count);
      }
    });
    
    // Format all fields consistently
    return {
      id: freeZone.id,
      name: freeZone.name,
      description: freeZone.description || "",
      location: freeZone.location || "",
      website: freeZone.website || "",
      email: freeZone.contactEmail || "",
      phone: freeZone.contactPhone || "",
      benefits: formatBenefitsList(freeZone.benefits),
      industries: formatIndustriesList(freeZone.industries),
      setupProcess: freeZone.setupProcess || "",
      legalRequirements: freeZone.legalRequirements || "",
      feeStructure: freeZone.feeStructure || "",
      licenseTypes: formatLicenseTypes(freeZone.licenseTypes),
      visaInformation: freeZone.visaInformation || "",
      facilities: formatFacilitiesList(freeZone.facilities),
      documentCategories: docCategories,
      totalDocuments: Object.values(docCategories).reduce((a, b) => a + b, 0),
      lastUpdated: freeZone.updatedAt || freeZone.createdAt,
      completenessScore: calculateCompletenessScore(freeZone)
    };
  } catch (error) {
    console.error("Error getting detailed free zone info:", error);
    return null;
  }
}

/**
 * Count documents for a specific free zone
 */
async function countDocumentsForFreeZone(freeZoneId: number): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${documents}
      WHERE free_zone_id = ${freeZoneId}
    `);
    
    return result[0]?.count ? Number(result[0].count) : 0;
  } catch (error) {
    console.error("Error counting documents:", error);
    return 0;
  }
}

/**
 * Calculate a data completeness score for a free zone
 */
function calculateCompletenessScore(freeZone: any): number {
  const keyFields = [
    'description', 'location', 'website', 
    'benefits', 'industries', 'setupProcess',
    'legalRequirements', 'feeStructure', 'licenseTypes',
    'visaInformation', 'facilities'
  ];
  
  const fieldWeights = {
    'description': 0.5,
    'location': 0.5,
    'website': 0.5,
    'benefits': 1.0,
    'industries': 1.0,
    'setupProcess': 1.5,
    'legalRequirements': 1.5,
    'feeStructure': 1.5,
    'licenseTypes': 1.5,
    'visaInformation': 1.0,
    'facilities': 1.0
  };
  
  let score = 0;
  let totalWeight = 0;
  
  keyFields.forEach(field => {
    const weight = fieldWeights[field] || 1.0;
    totalWeight += weight;
    
    if (freeZone[field]) {
      // Simple existence check
      if (typeof freeZone[field] === 'string') {
        // For string fields, consider length
        const content = freeZone[field].trim();
        if (content.length > 500) {
          score += weight; // Full points for substantial content
        } else if (content.length > 100) {
          score += weight * 0.7; // Partial points for medium content
        } else if (content.length > 0) {
          score += weight * 0.3; // Minimal points for brief content
        }
      } else {
        // For non-string fields (like arrays or objects from JSON)
        score += weight;
      }
    }
  });
  
  // Normalize to a 0-1 scale
  return totalWeight > 0 ? Math.min(score / totalWeight, 1) : 0;
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