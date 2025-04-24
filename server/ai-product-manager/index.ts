/**
 * AI Product Manager Module
 * 
 * This module handles advanced analytics, gap detection, and data enrichment
 * for the UAE business setup platform. It functions as an intelligent product
 * manager that can analyze existing data, identify gaps, and propose
 * improvements or fetch missing information.
 */

import { db } from '../db';
import { freeZones, businessActivities, isicActivities } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { WebResearchAssistant } from '../WebResearchAssistant';
import { openai } from '../openai';
import { logActivity } from './logger';

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface AnalysisResult {
  freeZoneId: number;
  freeZoneName: string;
  fields: {
    field: string;
    status: 'missing' | 'incomplete' | 'complete';
    confidence: number;
    recommendation?: string;
  }[];
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
 * Analyze the completeness of a specific free zone's data
 */
export async function analyzeFreeZoneData(freeZoneId: number): Promise<AnalysisResult> {
  try {
    // Get the free zone data
    const freeZoneData = await db
      .select()
      .from(freeZones)
      .where(eq(freeZones.id, freeZoneId));
    
    if (!freeZoneData || freeZoneData.length === 0) {
      throw new Error(`Free zone with ID ${freeZoneId} not found`);
    }
    
    const freeZone = freeZoneData[0];
    
    // Fields to check with their importance weighting (0-1)
    const fieldsToCheck = [
      { name: 'overview', weight: 1.0 },
      { name: 'benefits', weight: 0.8 },
      { name: 'setupProcessDescription', weight: 0.9 },
      { name: 'licenseTypes', weight: 0.9 },
      { name: 'facilities', weight: 0.7 },
      { name: 'locationDetails', weight: 0.6 },
      { name: 'requirements', weight: 0.9 },
      { name: 'setupCosts', weight: 0.8 },
      { name: 'faqContent', weight: 0.7 },
    ];
    
    // Analyze each field
    const fieldAnalysis = fieldsToCheck.map(field => {
      const fieldValue = freeZone[field.name as keyof typeof freeZone] as string | null;
      const isEmpty = !fieldValue;
      const isVeryShort = fieldValue && fieldValue.length < 100;
      
      let status: 'missing' | 'incomplete' | 'complete' = 'complete';
      let recommendation = '';
      
      if (isEmpty) {
        status = 'missing';
        recommendation = `The ${field.name} data is missing entirely. Recommend fetching this information.`;
      } else if (isVeryShort) {
        status = 'incomplete';
        recommendation = `The ${field.name} data is very brief. Consider enriching with more details.`;
      }
      
      return {
        field: field.name,
        status,
        confidence: status === 'complete' ? 1.0 : status === 'incomplete' ? 0.5 : 0.0,
        recommendation: status !== 'complete' ? recommendation : undefined
      };
    });
    
    // Calculate overall completeness
    const totalWeight = fieldsToCheck.reduce((sum, field) => sum + field.weight, 0);
    const weightedCompleteness = fieldsToCheck.reduce((sum, field, index) => {
      const analysis = fieldAnalysis[index];
      const completenessValue = analysis.status === 'complete' ? 1.0 : analysis.status === 'incomplete' ? 0.5 : 0.0;
      return sum + (completenessValue * field.weight);
    }, 0);
    
    const overallCompleteness = (weightedCompleteness / totalWeight) * 100;
    
    // Generate recommended actions
    const incompleteFields = fieldAnalysis.filter(field => field.status !== 'complete');
    const recommendedActions = incompleteFields.map(field => {
      return `Gather more information about ${field.field} for ${freeZone.name}.`;
    });
    
    if (recommendedActions.length === 0) {
      recommendedActions.push(`All data fields for ${freeZone.name} are complete. Consider enriching with more detailed information.`);
    }
    
    // Log the analysis activity
    await logActivity(
      'analyze', 
      `Analyzed data completeness for ${freeZone.name}. Overall completeness: ${overallCompleteness.toFixed(2)}%.`,
      { freeZoneId, completeness: overallCompleteness }
    );
    
    return {
      freeZoneId,
      freeZoneName: freeZone.name,
      fields: fieldAnalysis,
      overallCompleteness,
      recommendedActions
    };
  } catch (error) {
    console.error(`Error analyzing free zone data: ${error}`);
    throw error;
  }
}

/**
 * Analyze all free zones and identify gaps
 */
export async function analyzeAllFreeZones(): Promise<AnalysisResult[]> {
  try {
    // Get all free zones
    const freeZonesList = await db.select().from(freeZones);
    
    // Analyze each free zone
    const analysisResults = await Promise.all(
      freeZonesList.map(freeZone => analyzeFreeZoneData(freeZone.id))
    );
    
    // Log overall analysis
    const averageCompleteness = analysisResults.reduce((sum, result) => sum + result.overallCompleteness, 0) / analysisResults.length;
    
    await logActivity(
      'analyze', 
      `Analyzed all ${freeZonesList.length} free zones. Average completeness: ${averageCompleteness.toFixed(2)}%.`,
      { totalFreeZones: freeZonesList.length, averageCompleteness }
    );
    
    return analysisResults;
  } catch (error) {
    console.error(`Error analyzing all free zones: ${error}`);
    throw error;
  }
}

/**
 * Enrich free zone data by fetching missing information
 */
export async function enrichFreeZoneData(
  freeZoneId: number, 
  fieldName: string
): Promise<EnrichmentResult> {
  try {
    // Get the free zone data
    const freeZoneData = await db
      .select()
      .from(freeZones)
      .where(eq(freeZones.id, freeZoneId));
    
    if (!freeZoneData || freeZoneData.length === 0) {
      throw new Error(`Free zone with ID ${freeZoneId} not found`);
    }
    
    const freeZone = freeZoneData[0];
    const originalValue = freeZone[fieldName as keyof typeof freeZone] as string | null;
    const originalStatus: 'missing' | 'incomplete' = !originalValue ? 'missing' : 'incomplete';
    
    // Use WebResearchAssistant to fetch information
    const webResearch = new WebResearchAssistant();
    
    // Generate a specific query for the missing information
    const query = `Provide detailed information about ${fieldName} for ${freeZone.name} free zone in UAE. Include official data, requirements, and practical details.`;
    
    await logActivity(
      'research', 
      `Researching ${fieldName} for ${freeZone.name} free zone.`,
      { freeZoneId, fieldName, query }
    );
    
    const researchResult = await webResearch.conductResearch(query);
    
    // Process and format the result
    const formattedContent = formatFieldContent(fieldName, researchResult.content, freeZone.name);
    
    // Update the free zone data
    await db
      .update(freeZones)
      .set({ [fieldName]: formattedContent })
      .where(eq(freeZones.id, freeZoneId));
    
    await logActivity(
      'enrich', 
      `Enriched ${fieldName} for ${freeZone.name} free zone.`,
      { freeZoneId, fieldName, source: researchResult.sources.join(', ') }
    );
    
    return {
      freeZoneId,
      freeZoneName: freeZone.name,
      field: fieldName,
      originalStatus,
      newStatus: 'complete',
      content: formattedContent,
      source: researchResult.sources.join(', '),
      confidence: 0.85
    };
  } catch (error) {
    console.error(`Error enriching free zone data: ${error}`);
    throw error;
  }
}

/**
 * Format content based on the field type
 */
function formatFieldContent(fieldName: string, content: string, freeZoneName: string): string {
  switch(fieldName) {
    case 'overview':
      return `# ${freeZoneName} Overview\n\n${content}`;
      
    case 'benefits':
      // Extract benefits as a list
      return formatAsList(content, `# Benefits of ${freeZoneName}`);
      
    case 'setupProcessDescription':
      return `# Setting Up in ${freeZoneName}\n\n${content}`;
      
    case 'licenseTypes':
      return formatAsList(content, `# License Types in ${freeZoneName}`);
      
    case 'requirements':
      return formatAsList(content, `# Requirements for ${freeZoneName}`);
      
    case 'setupCosts':
      return `# Setup Costs for ${freeZoneName}\n\n${content}`;
      
    case 'faqContent':
      return formatAsFaq(content, freeZoneName);
      
    default:
      return content;
  }
}

/**
 * Format content as a list
 */
function formatAsList(content: string, title: string): string {
  // Use regex to find list-like patterns
  const listItems = content.match(/[•\-\*][\s\t]+(.*?)(?=[\n][•\-\*]|$)/gs);
  
  if (listItems && listItems.length > 0) {
    return `${title}\n\n${listItems.join('\n')}`;
  }
  
  // If no list items found, try to extract sentences
  const sentences = content.split(/\.\s+/);
  const formattedList = sentences
    .filter(sentence => sentence.trim().length > 20)
    .map(sentence => `* ${sentence.trim()}${!sentence.endsWith('.') ? '.' : ''}`)
    .join('\n');
    
  return `${title}\n\n${formattedList}`;
}

/**
 * Format content as FAQ
 */
function formatAsFaq(content: string, freeZoneName: string): string {
  const title = `# Frequently Asked Questions about ${freeZoneName}`;
  
  // Try to identify question-answer patterns
  const qaPattern = /(?:Q|Question)[\s\:]+(.+?)[\s\n]+(?:A|Answer)[\s\:]+(.+?)(?=[\n](?:Q|Question)|$)/gis;
  const matches = Array.from(content.matchAll(qaPattern));
  
  if (matches && matches.length > 0) {
    const faqs = matches.map(match => {
      const question = match[1].trim();
      const answer = match[2].trim();
      return `## ${question}\n${answer}`;
    }).join('\n\n');
    
    return `${title}\n\n${faqs}`;
  }
  
  // If no QA pattern found, try to extract questions
  const questionLines = content.split('\n')
    .filter(line => line.trim().endsWith('?'));
  
  if (questionLines.length > 3) {
    const faqSections = questionLines.map(question => {
      // Extract an answer from content that follows the question
      const questionIndex = content.indexOf(question);
      const nextQuestionIndex = content.indexOf('?', questionIndex + question.length);
      
      let answer = '';
      if (nextQuestionIndex > questionIndex) {
        answer = content.substring(questionIndex + question.length, nextQuestionIndex).trim();
      } else {
        answer = content.substring(questionIndex + question.length).trim();
      }
      
      if (!answer) answer = "Information not available.";
      
      return `## ${question.trim()}\n${answer}`;
    }).join('\n\n');
    
    return `${title}\n\n${faqSections}`;
  }
  
  // If no clear FAQ pattern, format as simple FAQs
  return `${title}\n\n## What is ${freeZoneName}?\n${content.substring(0, 250)}...\n\n## What are the benefits of ${freeZoneName}?\n${content.substring(250, 500) || 'Benefits information not available.'}`;
}

/**
 * Run web scraping script to fetch additional data
 */
export async function runScraperForFreeZone(
  freeZoneName: string, 
  targetUrl: string
): Promise<{success: boolean, output: string}> {
  return new Promise((resolve, reject) => {
    // Create a Python process for the scraper
    const scraperProcess = spawn('python', [
      '-c',
      `
import sys
import json
from bs4 import BeautifulSoup
import requests

try:
    url = "${targetUrl}"
    freezone_name = "${freeZoneName}"
    
    # Make the request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    # Parse the HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract relevant information
    title = soup.title.text if soup.title else "No title found"
    
    # Find main content areas
    main_content = ""
    content_elements = soup.find_all(['article', 'main', 'div'], class_=lambda c: c and ('content' in c.lower() or 'main' in c.lower()))
    
    if content_elements:
        main_content = max(content_elements, key=lambda e: len(e.get_text())).get_text(strip=True)
    else:
        # Fallback: get all paragraph text
        paragraphs = soup.find_all('p')
        main_content = "\\n".join([p.get_text(strip=True) for p in paragraphs])
    
    # Extract sections that might contain setup information
    setup_info = ""
    setup_sections = soup.find_all(['div', 'section'], class_=lambda c: c and ('setup' in c.lower() or 'process' in c.lower() or 'register' in c.lower()))
    
    if setup_sections:
        setup_info = "\\n".join([section.get_text(strip=True) for section in setup_sections])
    
    # Extract pricing if available
    pricing_info = ""
    pricing_sections = soup.find_all(['div', 'section', 'table'], class_=lambda c: c and ('price' in c.lower() or 'cost' in c.lower() or 'fee' in c.lower()))
    
    if pricing_sections:
        pricing_info = "\\n".join([section.get_text(strip=True) for section in pricing_sections])
    
    # Basic result structure
    result = {
        "success": True,
        "url": url,
        "freeZoneName": freezone_name,
        "title": title,
        "mainContent": main_content[:2000] if main_content else "",  # Limit size
        "setupInfo": setup_info[:1000] if setup_info else "",
        "pricingInfo": pricing_info[:1000] if pricing_info else ""
    }
    
    print(json.dumps(result))
    sys.exit(0)
except Exception as e:
    result = {
        "success": False,
        "url": "${targetUrl}",
        "freeZoneName": "${freeZoneName}",
        "error": str(e)
    }
    print(json.dumps(result))
    sys.exit(1)
      `
    ]);
    
    let resultData = '';
    let errorData = '';
    
    scraperProcess.stdout.on('data', (data) => {
      resultData += data.toString();
    });
    
    scraperProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    scraperProcess.on('close', (code) => {
      if (code !== 0) {
        logActivity(
          'scraper', 
          `Scraper failed for ${freeZoneName} with code ${code}.`,
          { freeZoneName, url: targetUrl, error: errorData }
        );
        resolve({
          success: false,
          output: errorData
        });
        return;
      }
      
      try {
        const result = JSON.parse(resultData);
        logActivity(
          'scraper', 
          `Successfully scraped data for ${freeZoneName}.`,
          { freeZoneName, url: targetUrl }
        );
        resolve({
          success: true,
          output: resultData
        });
      } catch (error) {
        logActivity(
          'scraper', 
          `Failed to parse scraper output for ${freeZoneName}.`,
          { freeZoneName, url: targetUrl, error: (error as Error).message }
        );
        resolve({
          success: false,
          output: `Failed to parse output: ${(error as Error).message}\nRaw output: ${resultData}`
        });
      }
    });
  });
}

/**
 * Get recommendations for improving platform UX and functionality
 */
export async function getProductRecommendations(): Promise<string[]> {
  try {
    // Analyze gaps in the data
    const freeZoneAnalysis = await analyzeAllFreeZones();
    
    // Calculate overall completeness
    const averageCompleteness = freeZoneAnalysis.reduce((sum, analysis) => sum + analysis.overallCompleteness, 0) / freeZoneAnalysis.length;
    
    // Identify commonly missing fields
    const fieldGaps: Record<string, {count: number, freeZones: string[]}> = {};
    
    freeZoneAnalysis.forEach(analysis => {
      analysis.fields
        .filter(field => field.status !== 'complete')
        .forEach(field => {
          if (!fieldGaps[field.field]) {
            fieldGaps[field.field] = { count: 0, freeZones: [] };
          }
          fieldGaps[field.field].count++;
          fieldGaps[field.field].freeZones.push(analysis.freeZoneName);
        });
    });
    
    // Generate AI recommendations based on the analysis
    const context = `
Current platform data analysis:
- ${freeZoneAnalysis.length} free zones analyzed
- Average data completeness: ${averageCompleteness.toFixed(2)}%
- Common data gaps: ${Object.entries(fieldGaps)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([field, data]) => `${field} (missing in ${data.count} free zones)`)
  .join(', ')}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a product manager for a UAE business setup platform. You need to provide strategic recommendations to improve the platform based on data analysis."
        },
        {
          role: "user",
          content: `${context}\n\nBased on this analysis, provide 5 specific and actionable recommendations to improve our UAE business setup platform. Focus on data enrichment, user experience, and new features that would add value.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const recommendations = response.choices[0].message.content || '';
    
    // Parse the recommendations into a list
    const recommendationList = recommendations
      .split(/\d+\.\s+/)
      .filter(item => item.trim().length > 0)
      .map(item => item.trim());
    
    await logActivity(
      'recommendations', 
      `Generated product recommendations based on data analysis.`,
      { averageCompleteness, recommendations: recommendationList }
    );
    
    return recommendationList;
  } catch (error) {
    console.error(`Error generating product recommendations: ${error}`);
    throw error;
  }
}

/**
 * Run a complete analysis and enhancement cycle for the platform
 */
export async function runProductManagerCycle(): Promise<{
  analysis: AnalysisResult[];
  enhancements: EnrichmentResult[];
  recommendations: string[];
}> {
  try {
    // Step 1: Analyze all free zones
    const analysis = await analyzeAllFreeZones();
    
    // Step 2: Identify fields that need enhancement (prioritize the most incomplete)
    const enhancementTasks: {freeZoneId: number, freeZoneName: string, field: string}[] = [];
    
    analysis.forEach(freeZoneAnalysis => {
      // Only select the most critical missing fields to enhance (max 2 per free zone)
      const incompleteFields = freeZoneAnalysis.fields
        .filter(field => field.status !== 'complete')
        .sort((a, b) => {
          // First by status (missing is higher priority than incomplete)
          if (a.status === 'missing' && b.status !== 'missing') return -1;
          if (a.status !== 'missing' && b.status === 'missing') return 1;
          
          // Then by the predefined importance of fields
          const fieldImportance: Record<string, number> = {
            'overview': 10,
            'setupProcessDescription': 9,
            'licenseTypes': 8,
            'requirements': 7,
            'setupCosts': 6,
            'benefits': 5,
            'facilities': 4,
            'locationDetails': 3,
            'faqContent': 2
          };
          
          return (fieldImportance[b.field] || 0) - (fieldImportance[a.field] || 0);
        })
        .slice(0, 2);
      
      incompleteFields.forEach(field => {
        enhancementTasks.push({
          freeZoneId: freeZoneAnalysis.freeZoneId,
          freeZoneName: freeZoneAnalysis.freeZoneName,
          field: field.field
        });
      });
    });
    
    // Step 3: Enrich the selected fields
    const enhancements: EnrichmentResult[] = [];
    
    // Only process a limited number of tasks to avoid overloading
    const tasksToProcess = enhancementTasks.slice(0, 5);
    
    if (tasksToProcess.length > 0) {
      await logActivity(
        'enhancement', 
        `Starting enhancement of ${tasksToProcess.length} fields across ${new Set(tasksToProcess.map(t => t.freeZoneId)).size} free zones.`,
        { tasks: tasksToProcess }
      );
      
      for (const task of tasksToProcess) {
        try {
          const result = await enrichFreeZoneData(task.freeZoneId, task.field);
          enhancements.push(result);
        } catch (error) {
          console.error(`Error enhancing ${task.field} for ${task.freeZoneName}: ${error}`);
          await logActivity(
            'enhancement', 
            `Failed to enhance ${task.field} for ${task.freeZoneName}.`,
            { error: (error as Error).message, freeZoneId: task.freeZoneId, field: task.field }
          );
        }
      }
    }
    
    // Step 4: Generate product recommendations
    const recommendations = await getProductRecommendations();
    
    // Log completion of the cycle
    await logActivity(
      'cycle', 
      `Completed product manager cycle. Analyzed ${analysis.length} free zones, enhanced ${enhancements.length} fields, generated ${recommendations.length} recommendations.`,
      { 
        freeZonesAnalyzed: analysis.length,
        fieldsEnhanced: enhancements.length, 
        recommendationsGenerated: recommendations.length 
      }
    );
    
    return {
      analysis,
      enhancements,
      recommendations
    };
  } catch (error) {
    console.error(`Error in product manager cycle: ${error}`);
    await logActivity(
      'cycle', 
      `Error in product manager cycle: ${(error as Error).message}`,
      { error: (error as Error).message }
    );
    throw error;
  }
}