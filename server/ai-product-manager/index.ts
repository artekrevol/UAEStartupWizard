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
    
    console.log(`[AI-PM] Starting detailed analysis for free zone ID: ${freeZoneId}`);
    
    // Fetch the free zone data
    const freeZoneResult = await db.execute(sql`
      SELECT * FROM free_zones WHERE id = ${freeZoneId}
    `);
    
    if (!freeZoneResult.rows.length) {
      throw new Error(`Free zone with ID ${freeZoneId} not found`);
    }
    
    const freeZone = freeZoneResult.rows[0];
    const freeZoneName = freeZone?.name || `Free Zone ID ${freeZoneId}`;
    
    console.log(`[AI-PM] Analyzing free zone: ${freeZoneName}`);
    
    // Fetch documents related to this free zone
    const documentsResult = await db.execute(sql`
      SELECT * FROM documents WHERE free_zone_id = ${freeZoneId}
    `);
    
    const documents = documentsResult.rows;
    console.log(`[AI-PM] Found ${documents.length} related documents for ${freeZoneName}`);
    
    // Log document categories for debugging
    if (documents.length > 0) {
      const categories = new Set(documents.map((doc: any) => doc.category).filter(Boolean));
      console.log(`[AI-PM] Document categories found: ${Array.from(categories).join(', ')}`);
    }
    
    // Define the key fields we want to analyze
    const keyFields = [
      'setup_process',
      'legal_requirements',
      'fee_structure',
      'visa_information',
      'facilities',
      'benefits'
    ];
    
    console.log(`[AI-PM] Analyzing ${keyFields.length} key fields for ${freeZoneName}`);
    
    // Use OpenAI to analyze the completeness of each field
    const fieldsAnalysis = await analyzeFieldsCompleteness(freeZone, documents, keyFields);
    
    // Initialize overall completeness to 0, we'll directly calculate from documents
    // SKIP the GPT-based completeness calculation which is unreliable
    let overallCompleteness = 0;
      
    // DIRECTLY calculate completeness based on document count
    // Don't check if overallCompleteness === 0, we'll just REPLACE the score
    if (documents.length > 0) {
      console.log(`[AI-PM] DIRECTLY calculating completeness based on ${documents.length} documents`);
      // ALWAYS perform manual document-based calculation
      const relevantCategories = ['business_setup', 'legal', 'compliance', 'financial'];
      
      // Count documents in relevant categories
      const relevantDocs = documents.filter((doc: any) => 
        typeof doc.category === 'string' && relevantCategories.includes(doc.category)
      ).length;
      
      // Count total documents for key fields
      let completenessScore = 0;
      
      // IMMEDIATE SCORE BASED ON DOCUMENT COUNT
      // If we have more than 30 documents, that's at least 60% completeness
      if (documents.length >= 30) {
        completenessScore = Math.max(completenessScore, 60);
        console.log(`[AI-PM] Based on ${documents.length} total documents, minimum completeness: 60%`);
      } else if (documents.length >= 15) {
        completenessScore = Math.max(completenessScore, 50);
        console.log(`[AI-PM] Based on ${documents.length} total documents, minimum completeness: 50%`);
      } else if (documents.length >= 5) {
        completenessScore = Math.max(completenessScore, 40);
        console.log(`[AI-PM] Based on ${documents.length} total documents, minimum completeness: 40%`);
      }
      
      // Documents indicate completeness for specific fields
      if (documents.filter((doc: any) => typeof doc.category === 'string' && doc.category === 'business_setup').length > 3) {
        completenessScore += 15;
        // Mark setup_process as complete in the fieldsAnalysis
        const setupField = fieldsAnalysis.find(f => f.field === 'setup_process');
        if (setupField) {
          setupField.status = 'complete';
          setupField.confidence = 0.8;
        }
      }
      
      if (documents.filter((doc: any) => typeof doc.category === 'string' && doc.category === 'legal').length > 3) {
        completenessScore += 15;
        // Mark legal_requirements as complete in the fieldsAnalysis
        const legalField = fieldsAnalysis.find(f => f.field === 'legal_requirements');
        if (legalField) {
          legalField.status = 'complete';
          legalField.confidence = 0.8;
        }
      }
      
      if (documents.filter((doc: any) => typeof doc.category === 'string' && doc.category === 'compliance').length > 3) {
        completenessScore += 10;
      }
      
      if (documents.filter((doc: any) => typeof doc.category === 'string' && doc.category === 'financial').length > 3) {
        completenessScore += 10;
        // Mark fee_structure as complete in the fieldsAnalysis
        const feeField = fieldsAnalysis.find(f => f.field === 'fee_structure');
        if (feeField) {
          feeField.status = 'complete';
          feeField.confidence = 0.8;
        }
      }
      
      // Documents with specific keywords/titles indicate completeness 
      for (const doc of documents) {
        const content = typeof doc.content === 'string' ? doc.content.toLowerCase() : '';
        const title = typeof doc.title === 'string' ? doc.title.toLowerCase() : '';
        
        if (content.includes('visa') || title.includes('visa')) {
          completenessScore += 10;
          // Mark visa_information as complete in the fieldsAnalysis
          const visaField = fieldsAnalysis.find(f => f.field === 'visa_information');
          if (visaField) {
            visaField.status = 'complete';
            visaField.confidence = 0.8;
          }
        }
        
        if (content.includes('benefit') || title.includes('benefit') || 
            content.includes('advantage') || title.includes('advantage')) {
          completenessScore += 5;
          // Mark benefits as complete in the fieldsAnalysis
          const benefitsField = fieldsAnalysis.find(f => f.field === 'benefits');
          if (benefitsField) {
            benefitsField.status = 'complete';
            benefitsField.confidence = 0.8;
          }
        }
        
        if (content.includes('facilit') || title.includes('facilit') ||
            content.includes('infrastructure') || title.includes('infrastructure')) {
          completenessScore += 5;
          // Mark facilities as complete in the fieldsAnalysis
          const facilitiesField = fieldsAnalysis.find(f => f.field === 'facilities');
          if (facilitiesField) {
            facilitiesField.status = 'complete';
            facilitiesField.confidence = 0.8;
          }
        }
      }
      
      // ALWAYS use document-based score, don't check documents.length >= 5
      const docBasedScore = Math.min(completenessScore, 100);
      console.log(`[AI-PM] Document-based completeness score: ${docBasedScore}%`);
      // REPLACE the completeness score entirely
      overallCompleteness = docBasedScore;
      
      // Also ensure recommendation fields are consistent with status
      fieldsAnalysis.forEach(field => {
        if (field.status === 'complete') {
          field.recommendation = "No recommendation needed";
        } else if (field.status === 'missing' && !field.recommendation) {
          field.recommendation = `Add comprehensive information about ${field.field.replace(/_/g, ' ')}.`;
        } else if (field.status === 'incomplete' && !field.recommendation) {
          field.recommendation = `Enhance existing information about ${field.field.replace(/_/g, ' ')}.`;
        }
      });
    }
    
    // Add detailed field status breakdown for reporting
    const completeFields = fieldsAnalysis.filter(f => f.status === 'complete').length;
    const incompleteFields = fieldsAnalysis.filter(f => f.status === 'incomplete').length;
    const missingFields = fieldsAnalysis.filter(f => f.status === 'missing').length;
    
    // Generate recommended actions
    const recommendedActions = generateRecommendedActions(fieldsAnalysis, freeZone);
    
    const result: FreeZoneAnalysis = {
      freeZoneId,
      freeZoneName: freeZoneName,
      fields: fieldsAnalysis,
      overallCompleteness,
      recommendedActions
    };
    
    // Log the successful analysis with detailed metrics
    console.log(`[AI-PM] Analysis complete for ${freeZoneName}:`);
    console.log(`[AI-PM] - Complete fields: ${completeFields}/${keyFields.length} (${((completeFields/keyFields.length)*100).toFixed(1)}%)`);
    console.log(`[AI-PM] - Incomplete fields: ${incompleteFields}/${keyFields.length} (${((incompleteFields/keyFields.length)*100).toFixed(1)}%)`);
    console.log(`[AI-PM] - Missing fields: ${missingFields}/${keyFields.length} (${((missingFields/keyFields.length)*100).toFixed(1)}%)`);
    console.log(`[AI-PM] - Overall weighted completeness: ${overallCompleteness.toFixed(2)}%`);
    
    await logActivity(
      'analyze-complete',
      `Completed analysis for ${freeZoneName} with ${overallCompleteness.toFixed(2)}% completeness`,
      { 
        freeZoneId, 
        freeZoneName: freeZoneName,
        completeness: overallCompleteness,
        fieldsAnalyzed: keyFields.length,
        fieldsComplete: completeFields,
        fieldsIncomplete: incompleteFields,
        fieldsMissing: missingFields,
        hasDocuments: documents.length > 0
      }
    );
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[AI-PM] Error analyzing free zone data: ${errorMessage}`);
    
    await logActivity(
      'analyze-error',
      `Error analyzing free zone: ${errorMessage}`,
      { freeZoneId, error: errorMessage },
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
    
    // Check if the field has a recommendation to determine if it really needs enrichment
    // Only block enrichment if the field is marked complete AND has no recommendation
    if (fieldStatus === 'complete' && 
        (!fieldsAnalysis[0].recommendation || 
         fieldsAnalysis[0].recommendation === 'No recommendation needed')) {
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
    
    // Update the free_zones table directly with the enriched data
    try {
      // Map fields to their actual column names in the database
      const columnNameMap: Record<string, string> = {
        // Core fields
        'license_types': 'license_types',
        'setup_process': 'setup_process',
        'legal_requirements': 'requirements',
        'fee_structure': 'setup_cost',
        'visa_information': 'visa_information',
        'facilities': 'facilities',
        'benefits': 'benefits',
        'faqs': 'faqs',
        'templates': 'templates',
        'timelines': 'timelines',
        'setup_cost': 'setup_cost',
        'industries': 'industries',
        
        // Alternative field names (for flexibility)
        'requirements': 'requirements',
        'visas': 'visa_information',
        'visa': 'visa_information',
        'costs': 'setup_cost',
        'fees': 'setup_cost',
        'office_spaces': 'facilities',
        'warehouses': 'facilities',
        'business_activities': 'industries',
        'sectors': 'industries',
        'description': 'description',
        'overview': 'description',
        'about': 'description',
        'advantages': 'benefits'
      };
      
      // Get the correct column name for this field
      const columnName = columnNameMap[field] || field;
      
      console.log(`[AI-PM] Mapped field "${field}" to database column "${columnName}"`);
      
      // Format the content appropriately based on field type with enhanced formatting
      let formattedContent: any;
      
      // Define common patterns for list detection
      const bulletPatterns = /\n-|\n\d+\.|\n\*|\n•|\n✓|\n✔|\n→/;
      const headingPattern = /\*\*(?=[A-Z])|\n##\s|\n###\s|\n####\s/;
      
      if (field === 'faqs' || columnName === 'faqs') {
        // Try to parse the content as FAQs with enhanced detection
        try {
          // First try to extract Q&A format with explicit Q: A: pattern
          const extractedFaqs = content.match(/Q:(.+?)A:(.+?)(?=Q:|$)/gs)?.map(qa => {
            const question = qa.match(/Q:(.*?)(?=A:)/s)?.[1]?.trim() || '';
            const answer = qa.match(/A:(.*?)(?=$)/s)?.[1]?.trim() || '';
            return { question, answer };
          }) || [];
          
          // Second approach: look for question mark patterns
          const questionPatternFaqs = extractedFaqs.length > 0 ? extractedFaqs : 
            content.split(/\n\n|\*\*Q:|(?=\*\*[^*]+\?)/g).map(paragraph => {
              // Clean up the paragraph
              const cleanParagraph = paragraph.trim().replace(/^\*\*|\*\*$/g, '');
              
              // Check if it contains a question mark
              const parts = cleanParagraph.split(/\n|\*\*A:|\?/);
              if (parts.length >= 2) {
                // Found a question and answer pattern
                const questionPart = parts[0].trim() + (parts[0].trim().endsWith('?') ? '' : '?');
                const answerPart = parts.slice(1).join(' ').trim();
                return { 
                  question: questionPart.replace(/^Q:\s*|-\s*|^\d+\.\s*/, ''),
                  answer: answerPart.replace(/^A:\s*/, '')
                };
              }
              return null;
            }).filter(Boolean);
            
          // Third approach: numbered or bulleted lists that might be FAQ-like
          const bulletedFaqs = questionPatternFaqs.length > 0 ? questionPatternFaqs :
            content.split(bulletPatterns).map(item => {
              const trimmedItem = item.trim();
              if (trimmedItem.includes('?')) {
                const parts = trimmedItem.split('?');
                return {
                  question: (parts[0] + '?').replace(/^\d+\.\s*/, ''),
                  answer: parts.slice(1).join('?').trim()
                };
              }
              return null;
            }).filter(Boolean);
          
          // Use the best result
          const faqs = bulletedFaqs.length > 0 ? bulletedFaqs : 
            [{ question: 'What information is available about this free zone?', answer: content }];
          
          formattedContent = JSON.stringify(faqs);
        } catch (err) {
          console.error('[AI-PM] Error parsing FAQs', err);
          formattedContent = JSON.stringify([{ 
            question: 'What information is available about this free zone?', 
            answer: content.substring(0, 500) + (content.length > 500 ? '...' : '')
          }]);
        }
      } else if (columnName === 'benefits') {
        // Special handling for benefits with enhanced formatting
        try {
          // First check if the content has bullet points
          if (content.match(bulletPatterns) || content.match(/\n\s*•|\n\s*-|\n\s*\*/)) {
            // Content has bullet points, split by them
            const items = content
              .split(bulletPatterns)
              .map(item => item.trim().replace(/^•|-|\*|\d+\.\s*/, ''))
              .filter(item => item.length > 3);
            
            // Clean up items
            const cleanedItems = items.map(item => {
              // Remove any trailing punctuation
              return item.replace(/[,;.]$/, '').trim();
            });
            
            formattedContent = JSON.stringify(cleanedItems);
          } else if (content.match(/:\s*/)) {
            // Try splitting by colons for potential key-value pairs
            const benefitPairs = content
              .split(/\n+/)
              .filter(line => line.includes(':'))
              .map(line => {
                const parts = line.split(/:\s*/);
                return parts[1]?.trim() || parts[0].trim();
              })
              .filter(item => item.length > 3);
              
            if (benefitPairs.length > 0) {
              formattedContent = JSON.stringify(benefitPairs);
            } else {
              // Fall back to paragraph splitting
              const paragraphs = content
                .split(/\n\n+/)
                .map(p => p.trim())
                .filter(p => p.length > 5);
                
              formattedContent = JSON.stringify(paragraphs);
            }
          } else {
            // No clear structure, try sentence-based splitting
            const sentences = content
              .split(/\.\s+/)
              .map(s => s.trim() + (s.trim().endsWith('.') ? '' : '.'))
              .filter(s => s.length > 10);
              
            formattedContent = JSON.stringify(sentences);
          }
        } catch (err) {
          console.error('[AI-PM] Error parsing benefits', err);
          formattedContent = content; // Fallback to raw content
        }
      } else if (columnName === 'industries') {
        // Enhanced handling for industries
        try {
          // First check if content has structured industry listings
          if (content.match(bulletPatterns) || content.match(headingPattern)) {
            // Split by bullet points or headings
            const rawItems = content
              .split(new RegExp(bulletPatterns.source + '|' + headingPattern.source, 'g'))
              .map(item => item.trim())
              .filter(item => item.length > 2 && !item.match(/^(industries|sectors|business activities)$/i));
            
            // Clean up industry names
            const industries = rawItems.map(item => {
              // Remove any category prefix like "Industry:" or numbering
              return item
                .replace(/^industry:?\s*/i, '')
                .replace(/^sector:?\s*/i, '')
                .replace(/^activities?:?\s*/i, '')
                .replace(/^\d+\.\s*/, '')
                .replace(/[,;.]$/, '') // Remove trailing punctuation
                .trim();
            });
            
            formattedContent = JSON.stringify(industries);
          } else if (content.includes(',')) {
            // Try comma-separated list approach
            const industries = content
              .split(',')
              .map(item => item.trim())
              .filter(item => item.length > 2);
              
            formattedContent = JSON.stringify(industries);
          } else {
            // Fall back to paragraph splitting
            const paragraphs = content
              .split(/\n\n+/)
              .map(p => p.trim())
              .filter(p => p.length > 3);
              
            formattedContent = JSON.stringify(paragraphs);
          }
        } catch (err) {
          console.error('[AI-PM] Error parsing industries', err);
          formattedContent = content; // Fallback to raw content
        }
      } else if (columnName === 'facilities') {
        // Enhanced handling for facilities
        try {
          if (content.match(bulletPatterns) || content.match(headingPattern)) {
            // Split by bullet points or headings
            const items = content
              .split(new RegExp(bulletPatterns.source + '|' + headingPattern.source, 'g'))
              .map(item => item.trim())
              .filter(item => item.length > 3 && !item.match(/^(facilities|amenities|infrastructure)$/i));
            
            // Clean up facility descriptions
            const facilities = items.map(item => {
              return item
                .replace(/^facility:?\s*/i, '')
                .replace(/^amenity:?\s*/i, '')
                .replace(/^\d+\.\s*/, '')
                .replace(/[,;.]$/, '') // Remove trailing punctuation
                .trim();
            });
            
            formattedContent = JSON.stringify(facilities);
          } else if (content.includes(':')) {
            // Try to parse as key-value pairs
            const facilityPairs = content
              .split(/\n+/)
              .filter(line => line.includes(':'))
              .map(line => {
                const parts = line.split(/:\s*/);
                if (parts.length >= 2) {
                  // If it looks like a feature description
                  return `${parts[0].trim()}: ${parts.slice(1).join(': ').trim()}`;
                }
                return line.trim();
              })
              .filter(item => item.length > 5);
              
            if (facilityPairs.length > 0) {
              formattedContent = JSON.stringify(facilityPairs);
            } else {
              // Fall back to paragraph splitting
              const paragraphs = content
                .split(/\n\n+/)
                .map(p => p.trim())
                .filter(p => p.length > 5);
                
              formattedContent = JSON.stringify(paragraphs);
            }
          } else {
            // No clear structure, use sentence-based splitting
            const sentences = content
              .split(/\.\s+/)
              .map(s => s.trim() + (s.trim().endsWith('.') ? '' : '.'))
              .filter(s => s.length > 10);
              
            formattedContent = JSON.stringify(sentences);
          }
        } catch (err) {
          console.error('[AI-PM] Error parsing facilities', err);
          formattedContent = content; // Fallback to raw content
        }
      } else if (columnName === 'licenseTypes' || columnName === 'license_types') {
        // Enhanced handling for license types
        try {
          // Try to identify if content has structured license listings
          if (content.match(bulletPatterns) || content.match(headingPattern)) {
            // First, try to extract license types with descriptions
            const licensePairs = [];
            const items = content
              .split(new RegExp(bulletPatterns.source + '|' + headingPattern.source, 'g'))
              .map(item => item.trim())
              .filter(item => item.length > 3);
              
            for (const item of items) {
              // Look for patterns like "Commercial License: This license..." or "Commercial License - This license..."
              if (item.match(/:\s*|-\s*|–\s*/)) {
                const parts = item.split(/:\s*|-\s*|–\s*/);
                if (parts.length >= 2) {
                  licensePairs.push({
                    name: parts[0].trim().replace(/^license:?\s*/i, ''),
                    description: parts.slice(1).join(': ').trim()
                  });
                } else {
                  licensePairs.push({ name: item, description: '' });
                }
              } else {
                licensePairs.push({ name: item, description: '' });
              }
            }
            
            if (licensePairs.length > 0) {
              formattedContent = JSON.stringify(licensePairs);
            } else {
              // Fall back to simpler array format
              const licenseNames = items.map(item => {
                return item
                  .replace(/^license:?\s*/i, '')
                  .replace(/^\d+\.\s*/, '')
                  .replace(/[,;.]$/, '') // Remove trailing punctuation
                  .trim();
              });
              
              formattedContent = JSON.stringify(licenseNames);
            }
          } else if (content.includes(':')) {
            // Try to parse as key-value pairs for license types and descriptions
            const licensePairs = [];
            const lines = content.split(/\n+/);
            
            for (const line of lines) {
              if (line.includes(':')) {
                const parts = line.split(/:\s*/);
                if (parts.length >= 2) {
                  licensePairs.push({
                    name: parts[0].trim(),
                    description: parts.slice(1).join(': ').trim()
                  });
                }
              }
            }
            
            if (licensePairs.length > 0) {
              formattedContent = JSON.stringify(licensePairs);
            } else {
              // Fall back to paragraph splitting
              const paragraphs = content
                .split(/\n\n+/)
                .map(p => p.trim())
                .filter(p => p.length > 5);
                
              formattedContent = JSON.stringify(paragraphs);
            }
          } else {
            // No clear structure, use sentence-based splitting
            const sentences = content
              .split(/\.\s+/)
              .map(s => s.trim() + (s.trim().endsWith('.') ? '' : '.'))
              .filter(s => s.length > 10);
              
            formattedContent = JSON.stringify(sentences);
          }
        } catch (err) {
          console.error('[AI-PM] Error parsing license types', err);
          formattedContent = content; // Fallback to raw content
        }
      } else if (columnName === 'setupCost' || columnName === 'feeStructure') {
        // Enhanced handling for costs and fees
        try {
          // Try to identify if content has structured cost listings
          if (content.match(bulletPatterns) || content.match(headingPattern)) {
            // First, try to extract cost items with amounts
            const costPairs = [];
            const items = content
              .split(new RegExp(bulletPatterns.source + '|' + headingPattern.source, 'g'))
              .map(item => item.trim())
              .filter(item => item.length > 3);
              
            for (const item of items) {
              // Look for patterns with currency or amounts
              if (item.match(/AED|USD|Dhs?|Dirham|fee|cost|charge/i)) {
                const amountMatch = item.match(/(AED|USD|Dhs?\.?|Dirham)\s*[\d,]+(\.\d+)?/i);
                if (amountMatch) {
                  // Found a likely cost item with amount
                  costPairs.push(item);
                } else {
                  // General cost item without specific amount
                  costPairs.push(item);
                }
              } else if (item.match(/[\d,]+(\.\d+)?\s*(AED|USD|Dhs?\.?|Dirham)/i)) {
                // Amount followed by currency
                costPairs.push(item);
              } else {
                costPairs.push(item);
              }
            }
            
            if (costPairs.length > 0) {
              formattedContent = JSON.stringify(costPairs);
            } else {
              // Fall back to simpler array format
              formattedContent = JSON.stringify(items);
            }
          } else if (content.includes(':')) {
            // Try to parse as key-value pairs for cost categories and amounts
            const costPairs = [];
            const lines = content.split(/\n+/);
            
            for (const line of lines) {
              if (line.includes(':')) {
                costPairs.push(line.trim());
              }
            }
            
            if (costPairs.length > 0) {
              formattedContent = JSON.stringify(costPairs);
            } else {
              // Fall back to paragraph splitting
              const paragraphs = content
                .split(/\n\n+/)
                .map(p => p.trim())
                .filter(p => p.length > 5);
                
              formattedContent = JSON.stringify(paragraphs);
            }
          } else {
            // Try to create a simple object
            formattedContent = JSON.stringify({ details: content });
          }
        } catch (err) {
          console.error('Error parsing costs', err);
          formattedContent = JSON.stringify({ details: content });
        }
      } else {
        // Use as plain text for other fields
        formattedContent = content;
      }
      
      // Update the free zone record with this data
      try {
        // Ensure proper JSON formatting for jsonb columns
        if (columnName === 'benefits' || 
            columnName === 'requirements' || 
            columnName === 'industries' || 
            columnName === 'license_types' || 
            columnName === 'facilities' || 
            columnName === 'setup_cost' || 
            columnName === 'faqs') {
          
          // Make sure formattedContent is a valid JSON string
          if (typeof formattedContent === 'string' && !formattedContent.startsWith('[') && !formattedContent.startsWith('{')) {
            // Convert plain text to a JSON array of one item for jsonb columns
            formattedContent = JSON.stringify([formattedContent]);
          }
          
          await db.execute(sql`
            UPDATE free_zones
            SET ${sql.raw(`${columnName} = ${formattedContent ? `'${formattedContent.replace(/'/g, "''")}'::jsonb` : 'NULL'}`)}
            WHERE id = ${freeZoneId}
          `);
        } else {
          // Regular text columns
          await db.execute(sql`
            UPDATE free_zones
            SET ${sql.raw(`${columnName} = ${formattedContent ? `'${formattedContent.replace(/'/g, "''")}'` : 'NULL'}`)}
            WHERE id = ${freeZoneId}
          `);
        }
        
        console.log(`[AI-PM] Updated free zone table directly with field "${field}" for ${freeZone.name}`);
      } catch (jsonError) {
        console.error(`[AI-PM] Error updating ${columnName} with JSON data:`, jsonError);
        // Fallback to a safe default JSON value
        if (columnName === 'benefits' || 
            columnName === 'requirements' || 
            columnName === 'industries' || 
            columnName === 'license_types' || 
            columnName === 'facilities' || 
            columnName === 'setup_cost' || 
            columnName === 'faqs') {
          
          const fallbackJson = JSON.stringify([`Information about ${field} (could not format original data properly)`]);
          
          await db.execute(sql`
            UPDATE free_zones
            SET ${sql.raw(`${columnName} = '${fallbackJson}'::jsonb`)}
            WHERE id = ${freeZoneId}
          `);
          
          console.log(`[AI-PM] Used fallback JSON for ${field} after formatting error`);
        }
      }
    } catch (updateError) {
      console.error(`Error updating free zone record: ${updateError}`);
      // Don't fail the overall process if this update fails
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
    
    // Update the analysis record to reflect this field is now complete
    try {
      // Get the latest analysis
      const analysisResult = await db.execute(sql`
        SELECT * FROM free_zone_analysis
        WHERE free_zone_id = ${freeZoneId}
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (analysisResult.rows.length > 0) {
        const analysis = analysisResult.rows[0];
        const fields = typeof analysis.fields === 'string' 
          ? JSON.parse(analysis.fields) 
          : analysis.fields;
        
        // Update the status of this field to "complete"
        const updatedFields = fields.map((f: any) => {
          if (f.field === field) {
            return {
              ...f,
              status: 'complete',
              confidence: 1.0 // Full confidence after enrichment
            };
          }
          return f;
        });
        
        // Calculate new overall completeness
        const completeFields = updatedFields.filter((f: any) => f.status === 'complete').length;
        const totalFields = updatedFields.length;
        const newOverallCompleteness = (completeFields / totalFields) * 100;
        
        // Save the updated analysis
        await db.execute(sql`
          UPDATE free_zone_analysis
          SET fields = ${JSON.stringify(updatedFields)}::jsonb,
              overall_completeness = ${newOverallCompleteness}
          WHERE id = ${analysis.id}
        `);
        
        console.log(`[AI-PM] Updated analysis record to mark ${field} as complete for ${freeZone.name}`);
      }
    } catch (analysisError) {
      console.error(`[AI-PM] Error updating analysis after enrichment: ${analysisError}`);
      // Non-fatal, continue with return
    }
    
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
  try {
    // Create a safe version of freeZone data
    const freeZoneData = {
      id: freeZone?.id || 0,
      name: freeZone?.name || 'Unknown Free Zone',
      description: freeZone?.description || '',
      website: freeZone?.website || '',
      location: freeZone?.location || '',
      benefits: freeZone?.benefits || {},
      requirements: freeZone?.requirements || {},
      facilities: freeZone?.facilities || {},
      license_types: freeZone?.license_types || {},
      documents: (documents || []).map(doc => ({
        title: doc?.title || '',
        category: doc?.category || '',
        content: doc?.content ? doc.content.substring(0, 500) : ''
      }))
    };
    
    // Add logging to track what we're analyzing
    console.log(`[AI-PM] Analyzing data for ${freeZoneData.name} (ID: ${freeZoneData.id})`);
    console.log(`[AI-PM] Found ${freeZoneData.documents.length} related documents`);
    
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
          And provide a brief recommendation for improving incomplete or missing fields.
          
          IMPORTANT: You MUST return your analysis as a valid JSON object with a "fields" array containing objects with exactly these keys: 
          - field (string)
          - status (one of "missing", "incomplete", or "complete")
          - confidence (number between 0 and 1)
          - recommendation (string)
          
          Example of correct format:
          {
            "fields": [
              {
                "field": "setup_process",
                "status": "complete",
                "confidence": 0.9,
                "recommendation": "No recommendation needed"
              },
              {
                "field": "legal_requirements",
                "status": "incomplete",
                "confidence": 0.7,
                "recommendation": "Add details about visa requirements"
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Analyze the following fields for the free zone "${freeZoneData.name}":
          ${fields.join(', ')}
          
          Available information:
          ${JSON.stringify(freeZoneData, null, 2)}
          
          For each field, provide:
          1. Field name (exactly as provided)
          2. Status (must be one of: "missing", "incomplete", "complete")
          3. Confidence score (0.0-1.0)
          4. Recommendation for improvement (if not complete)
          
          Return your analysis as a JSON object with a 'fields' array containing objects for each field analyzed.
          IMPORTANT: You MUST include the exact field name as provided and ensure your response is valid JSON.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1000
    });
    
    // Safely parse the response with detailed error handling
    let analysisResult: any = { fields: [] };
    try {
      const content = analysisResponse.choices[0].message.content || '{"fields": []}';
      console.log(`[AI-PM] Analysis response for ${freeZoneData.name}: ${content.substring(0, 100)}...`);
      
      // Log the full JSON response for debugging
      console.log(`[AI-PM] Full analysis response:`, content);
      
      // Add critical debugging for response structure
      try {
        const parsedObj = JSON.parse(content);
        console.log('[AI-PM] Response keys:', Object.keys(parsedObj));
        
        if (parsedObj.analysis) {
          console.log('[AI-PM] Analysis array length:', parsedObj.analysis.length);
          console.log('[AI-PM] First analysis item:', JSON.stringify(parsedObj.analysis[0]));
        } else if (parsedObj.fields) {
          console.log('[AI-PM] Fields array length:', parsedObj.fields.length);
          console.log('[AI-PM] First fields item:', JSON.stringify(parsedObj.fields[0]));
        } else if (parsedObj.result) {
          console.log('[AI-PM] Result array length:', parsedObj.result.length);
          console.log('[AI-PM] First result item:', JSON.stringify(parsedObj.result[0]));
        } else if (Array.isArray(parsedObj)) {
          console.log('[AI-PM] Root array length:', parsedObj.length);
          console.log('[AI-PM] First array item:', JSON.stringify(parsedObj[0]));
        } else {
          console.log('[AI-PM] Unknown response structure');
        }
      } catch (err) {
        console.log('[AI-PM] Error parsing for debug:', err);
      }
      
      analysisResult = JSON.parse(content);
      
      // Check for alternate field names in the response
      if (!analysisResult.fields && analysisResult.result) {
        console.log('[AI-PM] Found result array instead of fields, remapping');
        analysisResult.fields = analysisResult.result;
      } else if (!analysisResult.fields && analysisResult.analysis) {
        console.log('[AI-PM] Found analysis array instead of fields, remapping');
        analysisResult.fields = analysisResult.analysis;
      }
      
      // If still no fields array, check for other potential formats
      if (!analysisResult.fields && Array.isArray(analysisResult)) {
        console.log('[AI-PM] Found array at root level, using as fields');
        analysisResult = { fields: analysisResult };
      }
      
      // Last resort if we still have no fields
      if (!analysisResult.fields || !Array.isArray(analysisResult.fields)) {
        console.log('[AI-PM] No valid fields array found in response, creating default');
        analysisResult.fields = [];
      }
    } catch (parseError) {
      console.error(`[AI-PM] Error parsing analysis response: ${parseError}`);
      // Create a default analysis if parsing fails
      return fields.map(field => ({
        field,
        status: 'missing' as 'missing',
        confidence: 0.5,
        recommendation: `Unable to analyze ${field}. Please retry the analysis.`
      }));
    }
    
    // CREATE DEFAULT FIELDS FIRST, then override with any valid fields from analysis
    // Start with default for all requested fields
    const validatedFields: AnalysisField[] = [];
    
    // Create default entries for each requested field
    for (const fieldName of fields) {
      validatedFields.push({
        field: fieldName,
        status: 'missing' as 'missing' | 'incomplete' | 'complete',
        confidence: 0.5,
        recommendation: `No data found for ${fieldName}. Consider scraping specific information about this aspect.`
      });
    }
    
    // Add any valid fields from the analysis that match our requested fields
    if (analysisResult.fields && Array.isArray(analysisResult.fields)) {
      for (const field of analysisResult.fields) {
        if (field?.field && fields.includes(field.field)) {
          const existingIndex = validatedFields.findIndex(f => f.field === field.field);
          if (existingIndex >= 0) {
            // Update the existing field
            validatedFields[existingIndex] = {
              field: field.field,
              status: (field?.status === 'complete' || field?.status === 'incomplete' || field?.status === 'missing') 
                ? field.status 
                : 'missing',
              confidence: typeof field?.confidence === 'number' 
                ? Math.max(0, Math.min(1, field.confidence)) 
                : 0.5,
              recommendation: field?.recommendation || `Gather more information about this field.`
            };
          }
        }
      }
    }
    
    // We don't need this code block anymore since we already created defaults
    
    // Log analysis results for debugging
    const completeFields = validatedFields.filter(f => f.status === 'complete').length;
    console.log(`[AI-PM] Analyzed ${validatedFields.length} fields for ${freeZoneData.name}, ${completeFields} complete`);
    
    return validatedFields;
  } catch (error) {
    console.error(`[AI-PM] Error in analyzeFieldsCompleteness: ${error}`);
    
    // Return default analysis with error status if anything fails
    return fields.map(field => ({
      field,
      status: 'missing' as 'missing',
      confidence: 0.5,
      recommendation: `Analysis failed. Please retry.`
    }));
  }
}

/**
 * Generate recommended actions based on fields analysis
 */
function generateRecommendedActions(
  fieldsAnalysis: AnalysisField[],
  freeZone: any
): string[] {
  try {
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
      // Safely access field property and transform
      const fieldNames = incompleteFields.map(f => {
        // Handle undefined or null field names
        if (!f.field) return 'unknown field';
        
        // Safely replace underscores with spaces if they exist
        return f.field.replace(/_/g, ' ');
      }).join(', ');
      
      actions.push(`Prioritize enriching data for the following fields: ${fieldNames}`);
    }
    
    // Safely get the free zone name
    const freeZoneName = freeZone?.name || 'this free zone';
    
    if (incompleteFields.length === 0) {
      actions.push(`All key fields for ${freeZoneName} are complete. Consider adding more specialized information to enhance the quality further.`);
    }
    
    // Add fallback message if no actions were generated
    if (actions.length === 0) {
      actions.push(`Review the free zone data and identify areas for improvement.`);
    }
    
    return actions;
  } catch (error) {
    console.error(`[AI-PM] Error generating recommended actions: ${error}`);
    return [`Review the data completeness analysis and identify areas for improvement.`];
  }
}