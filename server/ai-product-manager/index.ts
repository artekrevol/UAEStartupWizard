/**
 * AI Product Manager
 * 
 * This module provides AI-driven product management capabilities for analyzing
 * and enhancing free zone data, generating insights, and automating content enrichment.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logActivity } from './logger';
import { searchWeb, scrapeUrl, searchAndScrape } from './search-service';
import OpenAI from 'openai';
import { performWebResearch } from '../WebResearchAssistant';

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AnalysisField {
  field: string;
  status: 'missing' | 'incomplete' | 'complete';
  confidence: number;
  recommendation?: string;
}

interface FreeZoneAnalysis {
  freeZoneId: number;
  freeZoneName: string;
  fields: AnalysisField[];
  overallCompleteness: number;
  recommendedActions: string[];
}

interface EnrichmentResult {
  freeZoneId: number;
  freeZoneName: string;
  field: string;
  originalStatus: 'missing' | 'incomplete';
  newStatus: 'incomplete' | 'complete';
  content: string;
  source: string;
  confidence: number;
}

/**
 * Analyze the completeness of data for a specific free zone
 */
export async function analyzeFreeZoneData(freeZoneId: number): Promise<FreeZoneAnalysis> {
  try {
    // Log the analysis start
    await logActivity(
      'analyze-start',
      `Starting analysis for free zone ID: ${freeZoneId}`,
      { freeZoneId }
    );
    
    // Fetch the free zone data
    const freeZoneResult = await db.execute(sql`
      SELECT * FROM free_zones WHERE id = ${freeZoneId}
    `);
    
    if (!freeZoneResult.rows.length) {
      throw new Error(`Free zone with ID ${freeZoneId} not found`);
    }
    
    const freeZone = freeZoneResult.rows[0];
    
    // Fetch documents related to this free zone
    const documentsResult = await db.execute(sql`
      SELECT * FROM documents WHERE free_zone_id = ${freeZoneId}
    `);
    
    const documents = documentsResult.rows;
    
    // Define the key fields we want to analyze
    const keyFields = [
      'setup_process',
      'legal_requirements',
      'fee_structure',
      'visa_information',
      'facilities',
      'benefits'
    ];
    
    // Use OpenAI to analyze the completeness of each field
    const fieldsAnalysis = await analyzeFieldsCompleteness(freeZone, documents, keyFields);
    
    // Calculate overall completeness
    const completeFields = fieldsAnalysis.filter(f => f.status === 'complete').length;
    const overallCompleteness = (completeFields / keyFields.length) * 100;
    
    // Generate recommended actions
    const recommendedActions = generateRecommendedActions(fieldsAnalysis, freeZone);
    
    const result: FreeZoneAnalysis = {
      freeZoneId,
      freeZoneName: freeZone.name,
      fields: fieldsAnalysis,
      overallCompleteness,
      recommendedActions
    };
    
    // Log the successful analysis
    await logActivity(
      'analyze-complete',
      `Completed analysis for ${freeZone.name} with ${overallCompleteness.toFixed(2)}% completeness`,
      { 
        freeZoneId, 
        freeZoneName: freeZone.name, 
        completeness: overallCompleteness,
        fieldsAnalyzed: keyFields.length,
        fieldsComplete: completeFields
      }
    );
    
    return result;
  } catch (error) {
    console.error(`Error analyzing free zone data: ${error}`);
    await logActivity(
      'analyze-error',
      `Error analyzing free zone: ${(error as Error).message}`,
      { freeZoneId, error: (error as Error).message },
      'ai-product-manager',
      'error'
    );
    
    throw error;
  }
}

/**
 * Analyze the completeness of data for all free zones
 */
export async function analyzeAllFreeZones(): Promise<FreeZoneAnalysis[]> {
  try {
    // Log the analysis start
    await logActivity(
      'analyze-all-start',
      'Starting analysis for all free zones',
      {}
    );
    
    // Fetch all free zones
    const freeZonesResult = await db.execute(sql`
      SELECT id FROM free_zones
    `);
    
    const freeZones = freeZonesResult.rows;
    
    // Analyze each free zone
    const analysisPromises = freeZones.map(zone => analyzeFreeZoneData(zone.id));
    const results = await Promise.all(analysisPromises);
    
    // Log the successful analysis
    await logActivity(
      'analyze-all-complete',
      `Completed analysis for ${freeZones.length} free zones`,
      { freeZoneCount: freeZones.length }
    );
    
    return results;
  } catch (error) {
    console.error(`Error analyzing all free zones: ${error}`);
    await logActivity(
      'analyze-all-error',
      `Error analyzing all free zones: ${(error as Error).message}`,
      { error: (error as Error).message },
      'ai-product-manager',
      'error'
    );
    
    throw error;
  }
}

/**
 * Enrich a specific field for a free zone with additional information
 */
export async function enrichFreeZoneData(
  freeZoneId: number, 
  field: string
): Promise<EnrichmentResult> {
  try {
    // Log the enrichment start
    await logActivity(
      'enrich-start',
      `Starting enrichment for field "${field}" in free zone ID: ${freeZoneId}`,
      { freeZoneId, field }
    );
    
    // Fetch the free zone data
    const freeZoneResult = await db.execute(sql`
      SELECT * FROM free_zones WHERE id = ${freeZoneId}
    `);
    
    if (!freeZoneResult.rows.length) {
      throw new Error(`Free zone with ID ${freeZoneId} not found`);
    }
    
    const freeZone = freeZoneResult.rows[0];
    
    // Determine the original status of the field
    const fieldsAnalysis = await analyzeFieldsCompleteness(
      freeZone, 
      [], // We don't need documents here
      [field]
    );
    
    const fieldStatus = fieldsAnalysis[0].status as 'missing' | 'incomplete';
    
    if (fieldStatus === 'complete') {
      throw new Error(`Field "${field}" is already complete for free zone ${freeZone.name}`);
    }
    
    // Use web research to find information about this field
    const searchQuery = `${freeZone.name} ${field.replace(/_/g, ' ')} UAE free zone`;
    
    const webResearchResult = await performWebResearch(searchQuery);
    
    // Get a detailed analysis of the content using OpenAI
    const contentAnalysis = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert on UAE free zones. Extract and structure information about "${field.replace(/_/g, ' ')}" 
          for ${freeZone.name}. Format it in a clear, comprehensive way for our database. Provide specific details, costs, 
          procedures, and requirements where applicable. Be direct and factual.`
        },
        {
          role: "user",
          content: `Based on this research: ${webResearchResult}, create structured content about "${field.replace(/_/g, ' ')}" 
          for ${freeZone.name}. Output only the content that would go into our database, omit any notes or hedges.`
        }
      ],
      temperature: 0.2,
      max_tokens: 800
    });
    
    const content = contentAnalysis.choices[0].message.content || '';
    
    // Save this information to the database
    const newStatus = content.length > 200 ? 'complete' : 'incomplete';
    const confidence = newStatus === 'complete' ? 0.9 : 0.5;
    
    // Create or update the related document
    const documentTitle = `${freeZone.name} - ${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    const documentFilename = `${freeZone.name.toLowerCase().replace(/\s+/g, '_')}_${field}.txt`;
    
    // Check if document already exists
    const existingDocResult = await db.execute(sql`
      SELECT id FROM documents 
      WHERE free_zone_id = ${freeZoneId} AND category = ${field}
    `);
    
    if (existingDocResult.rows.length > 0) {
      // Update existing document
      await db.execute(sql`
        UPDATE documents
        SET content = ${content}, 
            metadata = jsonb_set(metadata::jsonb, '{enriched}', 'true'::jsonb)
        WHERE id = ${existingDocResult.rows[0].id}
      `);
    } else {
      // Create new document
      await db.execute(sql`
        INSERT INTO documents (
          title, filename, file_path, category, free_zone_id, content, metadata
        ) VALUES (
          ${documentTitle},
          ${documentFilename},
          ${`/enriched/${documentFilename}`},
          ${field},
          ${freeZoneId},
          ${content},
          ${JSON.stringify({ 
            enriched: true, 
            source: 'AI Product Manager', 
            confidence,
            createdAt: new Date().toISOString()
          })}
        )
      `);
    }
    
    // Log the successful enrichment
    await logActivity(
      'enrich-complete',
      `Completed enrichment for field "${field}" in ${freeZone.name}`,
      { 
        freeZoneId, 
        freeZoneName: freeZone.name, 
        field,
        contentLength: content.length,
        newStatus
      },
      'enrich'
    );
    
    return {
      freeZoneId,
      freeZoneName: freeZone.name,
      field,
      originalStatus: fieldStatus,
      newStatus,
      content,
      source: 'Web Research',
      confidence
    };
  } catch (error) {
    console.error(`Error enriching free zone data: ${error}`);
    await logActivity(
      'enrich-error',
      `Error enriching free zone: ${(error as Error).message}`,
      { freeZoneId, field, error: (error as Error).message },
      'enrich',
      'error'
    );
    
    throw error;
  }
}

/**
 * Run a scraper for a specific free zone
 */
export async function runScraperForFreeZone(
  freeZoneName: string,
  url: string
): Promise<any> {
  try {
    // Log the scraper start
    await logActivity(
      'scraper-start',
      `Starting scraper for ${freeZoneName} at ${url}`,
      { freeZoneName, url }
    );
    
    // First, search for this free zone to get its ID
    const freeZoneResult = await db.execute(sql`
      SELECT id FROM free_zones WHERE name ILIKE ${`%${freeZoneName}%`}
    `);
    
    let freeZoneId: number;
    
    if (freeZoneResult.rows.length > 0) {
      freeZoneId = freeZoneResult.rows[0].id;
    } else {
      // Create a new free zone entry if it doesn't exist
      const newFreeZoneResult = await db.execute(sql`
        INSERT INTO free_zones (name, url, is_active)
        VALUES (${freeZoneName}, ${url}, true)
        RETURNING id
      `);
      
      freeZoneId = newFreeZoneResult.rows[0].id;
    }
    
    // Scrape the URL
    const scrapeResult = await scrapeUrl(url);
    
    if (scrapeResult.error) {
      throw new Error(scrapeResult.error);
    }
    
    // Extract and organize content with OpenAI
    const contentAnalysis = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert on UAE free zones. Extract and structure information about ${freeZoneName} from 
          the scraped content. Categorize the information into sections like 'setup_process', 'legal_requirements', 
          'fee_structure', 'visa_information', 'facilities', 'benefits', etc. Format in a clear way.`
        },
        {
          role: "user",
          content: `Scraped content from ${url}:\n\n${scrapeResult.content}\n\nExtract and organize the key information about
          ${freeZoneName} free zone from this content.`
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    });
    
    const structuredContent = contentAnalysis.choices[0].message.content || '';
    
    // Create a new document with the scraped content
    const documentTitle = `${freeZoneName} - Scraped Content from ${new URL(url).hostname}`;
    const documentFilename = `${freeZoneName.toLowerCase().replace(/\s+/g, '_')}_scraped_content.txt`;
    
    await db.execute(sql`
      INSERT INTO documents (
        title, filename, file_path, category, free_zone_id, content, metadata
      ) VALUES (
        ${documentTitle},
        ${documentFilename},
        ${`/scraped/${documentFilename}`},
        ${'general_information'},
        ${freeZoneId},
        ${structuredContent},
        ${JSON.stringify({ 
          source_url: url, 
          scraped_at: new Date().toISOString(),
          scraper: 'AI Product Manager',
          original_title: scrapeResult.title,
          original_content_length: scrapeResult.content.length
        })}
      )
    `);
    
    // Log the successful scraping
    await logActivity(
      'scraper-complete',
      `Completed scraping for ${freeZoneName}`,
      { 
        freeZoneName, 
        url,
        contentLength: structuredContent.length,
        freeZoneId
      },
      'scrape'
    );
    
    return {
      freeZoneName,
      freeZoneId,
      url,
      title: scrapeResult.title,
      content: structuredContent,
      success: true
    };
  } catch (error) {
    console.error(`Error running scraper: ${error}`);
    await logActivity(
      'scraper-error',
      `Error running scraper: ${(error as Error).message}`,
      { freeZoneName, url, error: (error as Error).message },
      'scrape',
      'error'
    );
    
    throw error;
  }
}

/**
 * Get product improvement recommendations
 */
export async function getProductRecommendations(): Promise<string[]> {
  try {
    // Get statistics to inform recommendations
    const freeZonesResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM free_zones
    `);
    
    const documentsResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM documents
    `);
    
    const freeZonesCount = parseInt(freeZonesResult.rows[0].count);
    const documentsCount = parseInt(documentsResult.rows[0].count);
    
    // Calculate average documents per free zone
    const avgDocsPerFreeZone = freeZonesCount > 0 ? documentsCount / freeZonesCount : 0;
    
    // Get document categories distribution
    const categoriesResult = await db.execute(sql`
      SELECT category, COUNT(*) as count 
      FROM documents 
      WHERE category IS NOT NULL 
      GROUP BY category
    `);
    
    const categories = categoriesResult.rows;
    
    // Use OpenAI to generate recommendations based on data
    const recommendationsResponse = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an AI Product Manager for a UAE Free Zone Business Setup platform.
          Your task is to provide specific, actionable product recommendations based on the
          current state of the data and user needs. Focus on data enrichment, user experience,
          and business value.`
        },
        {
          role: "user",
          content: `Based on the following data about our platform, provide 5-7 strategic recommendations:
          
          Current Status:
          - Total Free Zones: ${freeZonesCount}
          - Total Documents: ${documentsCount}
          - Average Documents per Free Zone: ${avgDocsPerFreeZone.toFixed(2)}
          - Document Categories Distribution: ${JSON.stringify(categories)}
          
          Provide actionable recommendations that would improve the platform's value. Be specific and strategic.`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    const recommendationsText = recommendationsResponse.choices[0].message.content || '';
    
    // Extract recommendations into an array
    const recommendationsArray = recommendationsText
      .split(/\d+\./)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    // Log the recommendations generation
    await logActivity(
      'recommendations-generated',
      `Generated ${recommendationsArray.length} product recommendations`,
      { 
        recommendationCount: recommendationsArray.length,
        freeZonesCount,
        documentsCount
      }
    );
    
    return recommendationsArray;
  } catch (error) {
    console.error(`Error generating recommendations: ${error}`);
    await logActivity(
      'recommendations-error',
      `Error generating recommendations: ${(error as Error).message}`,
      { error: (error as Error).message },
      'ai-product-manager',
      'error'
    );
    
    throw error;
  }
}

/**
 * Run a complete product manager cycle - analyze, enrich, and recommend
 */
export async function runProductManagerCycle(): Promise<{
  analysis: FreeZoneAnalysis[];
  enhancements: EnrichmentResult[];
  recommendations: string[];
}> {
  try {
    // Log the cycle start
    await logActivity(
      'cycle-start',
      'Starting full AI Product Manager cycle',
      {}
    );
    
    // 1. Analyze all free zones
    const analysisResults = await analyzeAllFreeZones();
    
    // 2. Identify and enrich the most critical fields
    const enhancementPromises: Promise<EnrichmentResult>[] = [];
    
    // For each free zone with less than 70% completeness, enrich one field
    for (const analysis of analysisResults) {
      if (analysis.overallCompleteness < 70) {
        const incompleteFields = analysis.fields
          .filter(field => field.status !== 'complete')
          .sort((a, b) => a.confidence - b.confidence);
        
        if (incompleteFields.length > 0) {
          const fieldToEnrich = incompleteFields[0].field;
          enhancementPromises.push(enrichFreeZoneData(analysis.freeZoneId, fieldToEnrich));
        }
      }
    }
    
    const enhancementResults = await Promise.all(enhancementPromises);
    
    // 3. Generate product recommendations
    const recommendations = await getProductRecommendations();
    
    // Log the successful cycle
    await logActivity(
      'cycle-complete',
      `Completed full AI Product Manager cycle: analyzed ${analysisResults.length} free zones, enriched ${enhancementResults.length} fields`,
      {
        freeZonesAnalyzed: analysisResults.length,
        fieldsEnriched: enhancementResults.length,
        recommendationsGenerated: recommendations.length
      }
    );
    
    return {
      analysis: analysisResults,
      enhancements: enhancementResults,
      recommendations
    };
  } catch (error) {
    console.error(`Error running product manager cycle: ${error}`);
    await logActivity(
      'cycle-error',
      `Error running product manager cycle: ${(error as Error).message}`,
      { error: (error as Error).message },
      'ai-product-manager',
      'error'
    );
    
    throw error;
  }
}

// --- Helper Functions ---

/**
 * Analyze the completeness of specific fields for a free zone
 */
async function analyzeFieldsCompleteness(
  freeZone: any,
  documents: any[],
  fields: string[]
): Promise<AnalysisField[]> {
  const freeZoneData = {
    ...freeZone,
    documents: documents.map(doc => ({
      title: doc.title,
      category: doc.category,
      content: doc.content ? doc.content.substring(0, 500) : null
    }))
  };
  
  // Use OpenAI to analyze field completeness
  const analysisResponse = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      {
        role: "system",
        content: `You are an expert data analyst for UAE free zones. Analyze the completeness of specific data fields
        for a free zone based on available information. For each field, determine if it is:
        - "missing" (no information available)
        - "incomplete" (some information, but insufficient)
        - "complete" (comprehensive information available)
        
        Also provide a confidence score from 0.0 to 1.0 for your assessment, where 1.0 means absolute certainty.
        And provide a brief recommendation for improving incomplete or missing fields.`
      },
      {
        role: "user",
        content: `Analyze the following fields for the free zone "${freeZone.name}":
        ${fields.join(', ')}
        
        Available information:
        ${JSON.stringify(freeZoneData, null, 2)}
        
        For each field, provide:
        1. Field name
        2. Status (missing/incomplete/complete)
        3. Confidence score (0.0-1.0)
        4. Recommendation for improvement (if not complete)
        
        Return in JSON format as an array of objects.`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 1000
  });
  
  const analysisResult = JSON.parse(analysisResponse.choices[0].message.content || '{"fields": []}');
  
  return analysisResult.fields || [];
}

/**
 * Generate recommended actions based on fields analysis
 */
function generateRecommendedActions(
  fieldsAnalysis: AnalysisField[],
  freeZone: any
): string[] {
  const incompleteFields = fieldsAnalysis.filter(f => f.status !== 'complete');
  
  const actions: string[] = [];
  
  // Add recommendations for incomplete fields
  for (const field of incompleteFields) {
    if (field.recommendation) {
      actions.push(field.recommendation);
    }
  }
  
  // Add general recommendations
  if (incompleteFields.length > 0) {
    actions.push(`Prioritize enriching data for the following fields: ${incompleteFields.map(f => f.field.replace(/_/g, ' ')).join(', ')}`);
  }
  
  if (incompleteFields.length === 0) {
    actions.push(`All key fields for ${freeZone.name} are complete. Consider adding more specialized information to enhance the quality further.`);
  }
  
  return actions;
}