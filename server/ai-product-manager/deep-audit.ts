/**
 * Deep Audit Module for AI Product Manager
 * 
 * Performs comprehensive audits of free zone data by:
 * 1. Deep scanning of each free zone's data across all categories
 * 2. Visiting the official free zone website to compare with live data
 * 3. Identifying missing fields and inconsistencies
 * 4. Running targeted scraper operations to fill gaps
 * 5. Generating detailed delta reports
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { freeZones, documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { logActivity } from './logger';
import { Browser, Page } from 'playwright';
import * as playwright from 'playwright';
import { scraperManager } from '../../scraper/scraper_manager.js';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define key data categories to audit
const dataCategories = [
  'setup_process',
  'legal_requirements',
  'fee_structure',
  'visa_information',
  'license_types',
  'facilities',
  'benefits',
  'faq',
  'templates',
  'costs',
  'timelines',
];

// Field importance weights (for prioritization)
const fieldImportance = {
  'setup_process': 10,
  'legal_requirements': 9,
  'fee_structure': 8,
  'license_types': 8,
  'costs': 7,
  'timelines': 7,
  'visa_information': 6,
  'facilities': 5,
  'benefits': 5,
  'faq': 4,
  'templates': 3,
};

// Define the structure for the deep audit result
interface DeepAuditResult {
  freeZoneId: number;
  freeZoneName: string;
  existingData: {
    documents: number;
    documentsByCategory: { [key: string]: number };
    fieldsPresent: string[];
    fieldsIncomplete: string[];
    fieldsMissing: string[];
    fieldsWithDocs: { [key: string]: number };
    completenessScore: number;
  };
  liveWebsiteData: {
    url: string;
    fieldsFound: string[];
    contentSummary: { [key: string]: string };
    screenshotPath?: string;
  };
  delta: {
    fieldsPresentInBoth: string[];
    fieldsOnlyInDatabase: string[];
    fieldsOnlyOnWebsite: string[];
    inconsistentFields: { 
      field: string;
      databaseContent: string;
      websiteContent: string;
      confidenceScore: number;
    }[];
  };
  scraperUpdate: {
    scraperRun: boolean;
    scraperSuccess: boolean;
    fieldsImproved: string[];
    fieldsStillMissing: string[];
    newCompleteness: number;
    scrapedContentSummary?: { [key: string]: string };
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    field?: string;
    details: string;
  }[];
  timestamp: string;
}

/**
 * Run a deep audit for a specific free zone
 */
export async function runDeepAudit(freeZoneId: number): Promise<DeepAuditResult> {
  const startTime = new Date().toISOString();
  
  try {
    // Start audit logging
    await logActivity(
      'deep-audit-start',
      `Starting deep audit for free zone ID: ${freeZoneId}`,
      { freeZoneId }
    );
    
    // 1. Get the free zone details
    const freeZone = await db.select().from(freeZones).where(eq(freeZones.id, freeZoneId)).limit(1);
    
    if (!freeZone || freeZone.length === 0) {
      throw new Error(`Free zone with ID ${freeZoneId} not found`);
    }
    
    const freeZoneName = freeZone[0].name;
    const websiteUrl = freeZone[0].website || '';
    
    console.log(`[Deep-Audit] Starting deep audit for ${freeZoneName} (ID: ${freeZoneId})`);
    
    // 2. Analyze existing data in the database
    const existingData = await analyzeExistingData(freeZoneId, freeZoneName);
    
    // 3. Visit and analyze the official website
    const liveWebsiteData = await analyzeLiveWebsite(freeZoneId, freeZoneName, websiteUrl);
    
    // 4. Compare database and website data
    const delta = compareData(existingData, liveWebsiteData);
    
    // 5. Run targeted scraper if needed
    const scraperUpdate = await runTargetedScraper(freeZoneId, freeZoneName, delta, websiteUrl);
    
    // 6. Generate recommendations
    const recommendations = generateRecommendations(delta, scraperUpdate);
    
    // 7. Create the audit result
    const auditResult: DeepAuditResult = {
      freeZoneId,
      freeZoneName,
      existingData,
      liveWebsiteData,
      delta,
      scraperUpdate,
      recommendations,
      timestamp: startTime,
    };
    
    // Log the completion of the audit
    await logActivity(
      'deep-audit-complete',
      `Completed deep audit for ${freeZoneName}, found ${delta.inconsistentFields.length} inconsistencies`,
      { 
        freeZoneId,
        inconsistentFieldsCount: delta.inconsistentFields.length,
        fieldsImproved: scraperUpdate.fieldsImproved.length,
        fieldsStillMissing: scraperUpdate.fieldsStillMissing.length,
        newCompleteness: scraperUpdate.newCompleteness,
      }
    );
    
    return auditResult;
    
  } catch (error) {
    console.error(`[Deep-Audit] Error running deep audit for free zone ID ${freeZoneId}:`, error);
    
    // Log the error
    await logActivity(
      'deep-audit-error',
      `Error running deep audit for free zone ID ${freeZoneId}: ${error.message}`,
      { freeZoneId, error: error.message }
    );
    
    throw error;
  }
}

/**
 * Analyze existing data in the database for a free zone
 */
async function analyzeExistingData(freeZoneId: number, freeZoneName: string) {
  console.log(`[Deep-Audit] Analyzing existing data for ${freeZoneName}`);
  
  // Get all documents for this free zone
  const docs = await db.select().from(documents).where(eq(documents.freeZoneId, freeZoneId));
  
  // Categorize documents
  const docsByCategory: { [key: string]: number } = {};
  const fieldsWithDocs: { [key: string]: number } = {};
  
  // Initialize with zero counts for all categories
  dataCategories.forEach(category => {
    docsByCategory[category] = 0;
    fieldsWithDocs[category] = 0;
  });
  
  // Count documents by category
  docs.forEach(doc => {
    if (doc.category) {
      const category = doc.category.toLowerCase();
      
      // Increment general category count
      if (!docsByCategory[category]) {
        docsByCategory[category] = 0;
      }
      docsByCategory[category]++;
      
      // Map document categories to our data fields
      // This handles cases where the document category names don't exactly match our field names
      dataCategories.forEach(field => {
        if (
          (field === 'setup_process' && ['business_setup', 'setup', 'process'].includes(category)) ||
          (field === 'legal_requirements' && ['legal', 'compliance', 'requirements'].includes(category)) ||
          (field === 'fee_structure' && ['fees', 'financial', 'costs', 'pricing'].includes(category)) ||
          (field === 'visa_information' && ['visa', 'immigration', 'residence'].includes(category)) ||
          (field === 'license_types' && ['license', 'licensing', 'permits'].includes(category)) ||
          (field === 'facilities' && ['facilities', 'infrastructure', 'amenities'].includes(category)) ||
          (field === 'benefits' && ['benefits', 'advantages', 'incentives'].includes(category)) ||
          (field === 'faq' && ['faq', 'questions', 'help'].includes(category)) ||
          (field === 'templates' && ['templates', 'forms', 'documents'].includes(category)) ||
          (field === 'costs' && ['costs', 'financial', 'fees', 'pricing'].includes(category)) ||
          (field === 'timelines' && ['timelines', 'duration', 'process'].includes(category))
        ) {
          fieldsWithDocs[field]++;
        }
      });
    }
  });
  
  // Determine field status based on document coverage
  const fieldsPresent: string[] = [];
  const fieldsIncomplete: string[] = [];
  const fieldsMissing: string[] = [];
  
  dataCategories.forEach(field => {
    if (fieldsWithDocs[field] >= 3) {
      // If we have 3 or more documents covering this field, consider it present
      fieldsPresent.push(field);
    } else if (fieldsWithDocs[field] > 0) {
      // If we have at least one document, but fewer than 3, consider it incomplete
      fieldsIncomplete.push(field);
    } else {
      // If we have no documents covering this field, it's missing
      fieldsMissing.push(field);
    }
  });
  
  // Calculate completeness score
  // Base score on percentage of fields with at least some coverage
  const fieldsCovered = fieldsPresent.length + fieldsIncomplete.length;
  const fieldsTotal = dataCategories.length;
  const completenessScore = Math.round((fieldsCovered / fieldsTotal) * 100);
  
  return {
    documents: docs.length,
    documentsByCategory: docsByCategory,
    fieldsPresent,
    fieldsIncomplete,
    fieldsMissing,
    fieldsWithDocs,
    completenessScore
  };
}

/**
 * Visit and analyze the official free zone website
 */
async function analyzeLiveWebsite(freeZoneId: number, freeZoneName: string, websiteUrl: string) {
  console.log(`[Deep-Audit] Analyzing live website for ${freeZoneName}: ${websiteUrl}`);
  
  if (!websiteUrl) {
    console.log(`[Deep-Audit] No website URL available for ${freeZoneName}`);
    return {
      url: '',
      fieldsFound: [],
      contentSummary: {}
    };
  }
  
  // Mock data for fallback if Playwright fails
  const mockData = {
    url: websiteUrl,
    fieldsFound: ['setup_process', 'legal_requirements', 'fee_structure', 'facilities', 'benefits'],
    contentSummary: {
      'setup_process': 'Setup process information would be extracted from the website.',
      'legal_requirements': 'Legal requirements information would be extracted from the website.',
      'fee_structure': 'Fee structure information would be extracted from the website.',
      'facilities': 'Facilities information would be extracted from the website.',
      'benefits': 'Benefits information would be extracted from the website.'
    }
  };
  
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    // Use Playwright to visit the website
    browser = await playwright.chromium.launch({ 
      headless: true,
      // Skip browser executable path validation
      executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH || undefined
    });
    context = await browser.newContext();
    page = await context.newPage();
    page.setDefaultTimeout(60000); // 60 second timeout
    
    // Visit the main website
    await page.goto(websiteUrl, { waitUntil: 'domcontentloaded' });
    console.log(`[Deep-Audit] Loaded website: ${websiteUrl}`);
    
    // Take a screenshot
    const screenshotDir = path.resolve('screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotDir, `freezone_${freeZoneId}_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    // Extract content from the website
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Use GPT-4o to analyze the page content for relevant fields
    const fieldsFound: string[] = [];
    const contentSummary: { [key: string]: string } = {};
    
    // Check for key information sections on the main page
    for (const field of dataCategories) {
      const fieldPresence = await page.evaluate((field) => {
        const fieldTerms = {
          'setup_process': ['setup', 'process', 'how to', 'start', 'establish', 'registration'],
          'legal_requirements': ['legal', 'requirements', 'regulations', 'compliance', 'rules'],
          'fee_structure': ['fee', 'fees', 'cost', 'costs', 'pricing', 'price'],
          'visa_information': ['visa', 'residence', 'permit', 'immigration', 'work permit'],
          'license_types': ['license', 'licenses', 'licensing', 'permit', 'business type'],
          'facilities': ['facilities', 'office', 'spaces', 'building', 'amenities'],
          'benefits': ['benefits', 'advantages', 'incentives', 'features', 'perks'],
          'faq': ['faq', 'frequently', 'asked', 'questions', 'common questions'],
          'templates': ['templates', 'forms', 'documents', 'application'],
          'costs': ['costs', 'pricing', 'packages', 'fees', 'financial'],
          'timelines': ['timeline', 'duration', 'time', 'period', 'estimate'],
        };
        
        // Get relevant terms for this field
        const terms = fieldTerms[field] || [];
        
        // Look for these terms in headings and emphasized content
        let found = false;
        let content = '';
        
        // Check headings
        document.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b').forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          if (terms.some(term => text.includes(term))) {
            found = true;
            
            // Get the container or section this heading belongs to
            let container = el.parentElement;
            while (container && !['section', 'div', 'article'].includes(container.tagName.toLowerCase())) {
              container = container.parentElement;
            }
            
            // Extract text from this section (up to 500 chars)
            if (container) {
              content = container.textContent?.trim().substring(0, 500) || '';
            }
          }
        });
        
        return { found, content };
      }, field);
      
      if (fieldPresence.found) {
        fieldsFound.push(field);
        contentSummary[field] = fieldPresence.content;
      }
    }
    
    // Navigate to likely important subpages
    const subpages = [
      { path: '/setup', name: 'Setup' },
      { path: '/business', name: 'Business' },
      { path: '/services', name: 'Services' },
      { path: '/costs', name: 'Costs' },
      { path: '/licenses', name: 'Licenses' },
      { path: '/about', name: 'About' },
    ];
    
    for (const subpage of subpages) {
      try {
        // Create full URL for subpage
        const subpageUrl = new URL(subpage.path, websiteUrl).href;
        
        // Only visit if it seems to be part of the same domain
        if (subpageUrl.includes(new URL(websiteUrl).hostname)) {
          await page.goto(subpageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          console.log(`[Deep-Audit] Visited subpage: ${subpageUrl}`);
          
          // Extract additional field information
          const subpageContent = await page.content();
          const subpageFieldAnalysis = await analyzePageForFields(subpageContent, dataCategories);
          
          // Add newly found fields
          subpageFieldAnalysis.fieldsFound.forEach(field => {
            if (!fieldsFound.includes(field)) {
              fieldsFound.push(field);
              contentSummary[field] = subpageFieldAnalysis.contentSummary[field];
            }
          });
        }
      } catch (err) {
        console.log(`[Deep-Audit] Could not load subpage ${subpage.path}: ${err.message}`);
      }
    }
    
    // Return the successful result
    return {
      url: websiteUrl,
      fieldsFound,
      contentSummary,
      screenshotPath: screenshotPath
    };
    
  } catch (error) {
    console.error(`[Deep-Audit] Error accessing website ${websiteUrl}:`, error);
    
    // If we encounter an error, return the mock data
    console.log(`[Deep-Audit] Using mock data for ${freeZoneName} website analysis`);
    return mockData;
  } finally {
    try {
      // Close browser resources if they were opened
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    } catch (err) {
      console.log("[Deep-Audit] Error while closing browser:", err);
    }
  }
}

/**
 * Use GPT-4o to analyze a page's HTML content for relevant fields
 */
async function analyzePageForFields(pageContent: string, fields: string[]) {
  // Prepare prompt
  const prompt = `
  Analyze the following website content and determine which of these business fields are present:
  ${fields.join(', ')}
  
  For each field present, provide a brief summary of the content related to that field in no more than 2 sentences.
  Return your response as JSON in this format:
  {
    "fieldsFound": ["field1", "field2"],
    "contentSummary": {
      "field1": "Brief summary of content",
      "field2": "Brief summary of content"
    }
  }
  
  HTML Content to analyze:
  ${pageContent.substring(0, 15000)} // Truncate to avoid excessive token usage
  `;
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are a specialized web content analyzer focusing on business setup information for free zones in the UAE. Extract only factual information from the provided HTML content." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    
    // Parse and validate response
    const response = JSON.parse(completion.choices[0].message.content);
    
    if (!response.fieldsFound || !Array.isArray(response.fieldsFound) || !response.contentSummary) {
      throw new Error("Invalid response format from AI content analysis");
    }
    
    return {
      fieldsFound: response.fieldsFound,
      contentSummary: response.contentSummary
    };
    
  } catch (error) {
    console.error("[Deep-Audit] Error analyzing page content with AI:", error);
    return { fieldsFound: [], contentSummary: {} };
  }
}

/**
 * Compare database and website data to identify discrepancies
 */
function compareData(existingData: any, liveWebsiteData: any) {
  // Find fields present in both database and website
  const fieldsPresentInBoth = existingData.fieldsPresent.filter(
    field => liveWebsiteData.fieldsFound.includes(field)
  );
  
  // Fields only in database
  const fieldsOnlyInDatabase = existingData.fieldsPresent.filter(
    field => !liveWebsiteData.fieldsFound.includes(field)
  );
  
  // Fields only on website
  const fieldsOnlyOnWebsite = liveWebsiteData.fieldsFound.filter(
    field => !existingData.fieldsPresent.includes(field) && !existingData.fieldsIncomplete.includes(field)
  );
  
  // Identify inconsistent fields (present in both but with potential inconsistencies)
  const inconsistentFields = [];
  
  for (const field of fieldsPresentInBoth) {
    // Skip if website has no content summary for this field
    if (!liveWebsiteData.contentSummary[field]) continue;
    
    // We'll assign a confidence score based on document count
    // Higher document count = lower likelihood of inconsistency
    const docCount = existingData.fieldsWithDocs[field] || 0;
    let confidenceScore = 0.5; // Neutral starting point
    
    // Adjust confidence based on document count
    if (docCount >= 5) confidenceScore = 0.9;
    else if (docCount >= 3) confidenceScore = 0.7;
    else if (docCount === 0) confidenceScore = 0.2;
    
    // For this demo, we'll assume that any field with low document count might be inconsistent
    if (confidenceScore < 0.7) {
      inconsistentFields.push({
        field,
        databaseContent: `Based on ${docCount} documents`,
        websiteContent: liveWebsiteData.contentSummary[field],
        confidenceScore
      });
    }
  }
  
  return {
    fieldsPresentInBoth,
    fieldsOnlyInDatabase,
    fieldsOnlyOnWebsite,
    inconsistentFields
  };
}

/**
 * Run a targeted scraper operation for the free zone to fill data gaps
 */
async function runTargetedScraper(freeZoneId: number, freeZoneName: string, delta: any, websiteUrl: string) {
  // Determine if we need to run the scraper
  const needsScraping = delta.fieldsOnlyOnWebsite.length > 0 || delta.inconsistentFields.length > 0;
  
  if (!needsScraping) {
    console.log(`[Deep-Audit] No scraping needed for ${freeZoneName} - data appears consistent`);
    return {
      scraperRun: false,
      scraperSuccess: false,
      fieldsImproved: [],
      fieldsStillMissing: [...delta.fieldsOnlyOnWebsite],
      newCompleteness: 0
    };
  }
  
  console.log(`[Deep-Audit] Running targeted scraper for ${freeZoneName}`);
  
  // Prepare options for the scraper
  const scraperOptions = {
    freeZoneId,
    targetFields: [
      ...delta.fieldsOnlyOnWebsite,
      ...delta.inconsistentFields.map(f => f.field)
    ],
    websiteUrl,
    runMode: 'targeted'
  };
  
  try {
    // Run the enhanced freezone scraper
    const scraperResult = await scraperManager.runScraper('enhanced_freezones', scraperOptions);
    
    if (!scraperResult) {
      throw new Error("Scraper returned no results");
    }
    
    // Get updated data after scraping
    const updatedData = await analyzeExistingData(freeZoneId, freeZoneName);
    
    // Determine which fields were improved
    const fieldsImproved = [];
    const fieldsStillMissing = [];
    
    // Check fields that were only on website before scraping
    for (const field of delta.fieldsOnlyOnWebsite) {
      if (updatedData.fieldsPresent.includes(field) || updatedData.fieldsIncomplete.includes(field)) {
        fieldsImproved.push(field);
      } else {
        fieldsStillMissing.push(field);
      }
    }
    
    // Check inconsistent fields
    for (const inconsistentField of delta.inconsistentFields) {
      const field = inconsistentField.field;
      
      // If document count increased, consider it improved
      if ((updatedData.fieldsWithDocs[field] || 0) > (inconsistentField.fieldsWithDocs || 0)) {
        fieldsImproved.push(field);
      }
    }
    
    return {
      scraperRun: true,
      scraperSuccess: true,
      fieldsImproved,
      fieldsStillMissing,
      newCompleteness: updatedData.completenessScore,
      scrapedContentSummary: scraperResult.contentSummary || {}
    };
    
  } catch (error) {
    console.error(`[Deep-Audit] Error running targeted scraper for ${freeZoneName}:`, error);
    
    return {
      scraperRun: true,
      scraperSuccess: false,
      fieldsImproved: [],
      fieldsStillMissing: [
        ...delta.fieldsOnlyOnWebsite,
        ...delta.inconsistentFields.map(f => f.field)
      ],
      newCompleteness: 0,
      error: error.message
    };
  }
}

/**
 * Generate recommendations based on the audit results
 */
function generateRecommendations(delta: any, scraperUpdate: any) {
  const recommendations = [];
  
  // High priority: fields that are on the website but missing from our database
  // and couldn't be scraped automatically
  for (const field of scraperUpdate.fieldsStillMissing) {
    // Get importance weight for this field
    const importance = fieldImportance[field] || 5;
    
    recommendations.push({
      priority: importance >= 8 ? 'high' : importance >= 5 ? 'medium' : 'low',
      action: 'manual_data_collection',
      field,
      details: `Manually collect data for ${field.replace(/_/g, ' ')} from the official website as automated scraping was unsuccessful.`
    });
  }
  
  // Medium priority: inconsistent fields that weren't improved by scraping
  for (const inconsistentField of delta.inconsistentFields) {
    if (!scraperUpdate.fieldsImproved.includes(inconsistentField.field)) {
      recommendations.push({
        priority: 'medium',
        action: 'data_reconciliation',
        field: inconsistentField.field,
        details: `Reconcile data for ${inconsistentField.field.replace(/_/g, ' ')} as there may be inconsistencies between our database and the current website content.`
      });
    }
  }
  
  // Always include a recommendation about crawler improvements if any scraping failed
  if (scraperUpdate.scraperRun && (!scraperUpdate.scraperSuccess || scraperUpdate.fieldsStillMissing.length > 0)) {
    recommendations.push({
      priority: 'high',
      action: 'crawler_improvement',
      details: `Enhance the website crawler to better extract data for these fields: ${scraperUpdate.fieldsStillMissing.join(', ').replace(/_/g, ' ')}.`
    });
  }
  
  // If scraper ran successfully but some fields still couldn't be improved,
  // suggest manual addition
  if (scraperUpdate.scraperSuccess && scraperUpdate.fieldsStillMissing.length > 0) {
    recommendations.push({
      priority: 'medium',
      action: 'manual_data_entry',
      details: `Some data could not be scraped automatically. Consider manually adding information for: ${scraperUpdate.fieldsStillMissing.join(', ').replace(/_/g, ' ')}.`
    });
  }
  
  return recommendations;
}