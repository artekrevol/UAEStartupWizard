/**
 * Generic Free Zone Document Downloader
 * 
 * This module provides functions to download documents from any free zone website.
 * It uses a combination of Axios and Playwright to crawl and download documents.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import axios from 'axios';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

// File types to target for download
const TARGET_FILE_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.txt'
];

// Common document section keywords
const DOCUMENT_PAGE_KEYWORDS = [
  'download', 'documents', 'forms', 'publications', 'resources', 'guides', 'applications',
  'guidelines', 'requirements', 'procedures', 'fees', 'regulations', 'policies',
  'documentation', 'brochures', 'leaflets', 'manuals', 'handbooks', 'factsheets'
];

// Max number of pages to visit per free zone
const MAX_PAGES_PER_FREEZONE = 30;

// Base directory for storing downloaded documents
const BASE_DIR = path.resolve('./freezone_docs');

/**
 * Download a file using axios
 */
async function downloadFile(url, outputPath) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 30000,  // 30 seconds timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    fs.writeFileSync(outputPath, response.data);
    
    return {
      success: true,
      size: response.data.length,
      status: response.status
    };
  } catch (error) {
    console.error(`Error downloading file from ${url}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if a URL is a file
 */
function isFileUrl(url) {
  const parsedUrl = new URL(url);
  const pathName = parsedUrl.pathname.toLowerCase();
  return TARGET_FILE_EXTENSIONS.some(ext => pathName.endsWith(ext));
}

/**
 * Extract document links from HTML content
 */
function extractDocumentLinks($, baseUrl) {
  const links = [];
  const seenUrls = new Set();

  // Look for all links
  $('a').each((i, element) => {
    const href = $(element).attr('href');
    if (!href) return;

    try {
      // Normalize URL
      const resolvedUrl = new URL(href, baseUrl).href;
      
      // Skip if already seen
      if (seenUrls.has(resolvedUrl)) return;
      seenUrls.add(resolvedUrl);
      
      // Check if it's a file
      const isFile = isFileUrl(resolvedUrl);
      
      // Add link with metadata
      links.push({
        url: resolvedUrl,
        text: $(element).text().trim(),
        isFile,
        fileType: isFile ? path.extname(resolvedUrl).substring(1) : null
      });
    } catch (error) {
      // Skip invalid URLs
      console.log(`Skipping invalid URL: ${href}`);
    }
  });
  
  return links;
}

/**
 * Determine document categories based on URL and link text
 */
function determineDocumentCategory(url, linkText) {
  const urlLower = url.toLowerCase();
  const textLower = linkText.toLowerCase();
  
  // Map of category keywords to category names
  const categoryMappings = {
    'business': 'business_setup',
    'setup': 'business_setup',
    'establish': 'business_setup',
    'formation': 'business_setup',
    'register': 'business_setup',
    'incorporation': 'business_setup',
    'license': 'business_setup',
    'compliance': 'compliance',
    'regulation': 'compliance',
    'law': 'legal',
    'legal': 'legal',
    'visa': 'visa',
    'immigration': 'visa',
    'employ': 'visa',
    'permit': 'visa',
    'finance': 'financial',
    'fee': 'financial',
    'tax': 'financial',
    'banking': 'financial',
    'form': 'forms',
    'application': 'forms',
    'template': 'forms',
    'guide': 'guides',
    'handbook': 'guides',
    'manual': 'guides',
    'faq': 'knowledge_bank',
    'service': 'services',
    'facility': 'facilities',
    'benefit': 'benefits',
    'advantage': 'benefits',
    'trade': 'trade'
  };
  
  // Check for category keywords in URL and link text
  for (const [keyword, category] of Object.entries(categoryMappings)) {
    if (urlLower.includes(keyword) || textLower.includes(keyword)) {
      return category;
    }
  }
  
  // Default to 'general' if no category matched
  return 'general';
}

/**
 * Crawl a website to find document links
 */
async function crawlWebsiteForDocuments(baseUrl, maxPages = MAX_PAGES_PER_FREEZONE) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  
  try {
    const page = await context.newPage();
    
    // Set up request interception to avoid unnecessary requests
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,otf,eot}', route => route.abort());
    
    console.log(`Crawling ${baseUrl} for document links`);
    
    // Start with the base URL
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Get all links from the home page
    const content = await page.content();
    const $ = cheerio.load(content);
    const homeLinks = extractDocumentLinks($, baseUrl);
    
    // Filter links that might contain documents
    const potentialDocumentPages = homeLinks.filter(link => {
      // Skip file links for now (we'll collect them separately)
      if (link.isFile) return false;
      
      // Check if the URL or link text contains document-related keywords
      const urlLower = link.url.toLowerCase();
      const textLower = link.text.toLowerCase();
      
      return DOCUMENT_PAGE_KEYWORDS.some(keyword => 
        urlLower.includes(keyword) || textLower.includes(keyword));
    });
    
    console.log(`Found ${potentialDocumentPages.length} potential document pages`);
    
    // Collect documents from the home page
    const documentLinks = homeLinks.filter(link => link.isFile);
    const visitedUrls = new Set([baseUrl]);
    
    // Visit document pages up to the maximum limit
    const pagesToVisit = potentialDocumentPages.slice(0, maxPages);
    
    for (const linkObj of pagesToVisit) {
      if (visitedUrls.size >= maxPages) break;
      if (visitedUrls.has(linkObj.url)) continue;
      
      try {
        console.log(`Visiting ${linkObj.url}`);
        await page.goto(linkObj.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        visitedUrls.add(linkObj.url);
        
        // Extract links from this page
        const pageContent = await page.content();
        const $page = cheerio.load(pageContent);
        const pageLinks = extractDocumentLinks($page, linkObj.url);
        
        // Keep only file links
        const pageDocumentLinks = pageLinks.filter(link => link.isFile);
        console.log(`Found ${pageDocumentLinks.length} document links on ${linkObj.url}`);
        
        // Add to our collection
        documentLinks.push(...pageDocumentLinks);
      } catch (error) {
        console.error(`Error visiting ${linkObj.url}:`, error.message);
      }
    }
    
    // Add metadata to document links
    const documentsWithMetadata = documentLinks.map(doc => ({
      ...doc,
      category: determineDocumentCategory(doc.url, doc.text),
      title: doc.text || path.basename(doc.url),
      source: baseUrl
    }));
    
    console.log(`Total document links found: ${documentsWithMetadata.length}`);
    
    return {
      success: true,
      baseUrl,
      documentsFound: documentsWithMetadata.length,
      documents: documentsWithMetadata,
      visitedPages: Array.from(visitedUrls)
    };
  } catch (error) {
    console.error(`Error crawling ${baseUrl}:`, error.message);
    return {
      success: false,
      baseUrl,
      error: error.message,
      stack: error.stack
    };
  } finally {
    await browser.close();
  }
}

/**
 * Download documents for a specific free zone
 */
export async function downloadFreeZoneDocuments(freeZoneId, freeZoneName, freeZoneUrl) {
  try {
    console.log(`Starting document download for ${freeZoneName} (${freeZoneUrl})`);
    
    // Create directory for this free zone
    const freeZoneDir = path.join(BASE_DIR, freeZoneName.toLowerCase().replace(/\s+/g, '_'));
    
    if (!fs.existsSync(BASE_DIR)) {
      fs.mkdirSync(BASE_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(freeZoneDir)) {
      fs.mkdirSync(freeZoneDir, { recursive: true });
    }
    
    // Crawl the website for document links
    const crawlResult = await crawlWebsiteForDocuments(freeZoneUrl);
    
    if (!crawlResult.success) {
      return {
        success: false,
        freeZoneId,
        freeZoneName,
        error: crawlResult.error
      };
    }
    
    // Create summary file
    const summaryPath = path.join(freeZoneDir, 'download_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(crawlResult, null, 2));
    
    // Download each document
    console.log(`Found ${crawlResult.documents.length} documents to download`);
    
    const downloadResults = [];
    
    for (let i = 0; i < crawlResult.documents.length; i++) {
      const doc = crawlResult.documents[i];
      
      try {
        // Generate safe filename
        const fileExt = path.extname(new URL(doc.url).pathname);
        const safeName = doc.title
          .replace(/[^a-z0-9]/gi, '_')
          .replace(/_+/g, '_')
          .toLowerCase();
        const filename = `${safeName}${fileExt}`;
        const outputPath = path.join(freeZoneDir, filename);
        
        console.log(`Downloading ${i+1}/${crawlResult.documents.length}: ${doc.url}`);
        
        // Create category subdirectory if it doesn't exist
        const categoryDir = path.join(freeZoneDir, doc.category);
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true });
        }
        
        const categoryFilePath = path.join(categoryDir, filename);
        
        // Download the file
        const downloadResult = await downloadFile(doc.url, categoryFilePath);
        
        downloadResults.push({
          ...doc,
          downloadSuccess: downloadResult.success,
          filePath: categoryFilePath,
          filename,
          size: downloadResult.size,
          error: downloadResult.error
        });
      } catch (error) {
        console.error(`Error downloading ${doc.url}:`, error.message);
        
        downloadResults.push({
          ...doc,
          downloadSuccess: false,
          error: error.message
        });
      }
    }
    
    // Update the summary with download results
    crawlResult.downloadResults = downloadResults;
    fs.writeFileSync(summaryPath, JSON.stringify(crawlResult, null, 2));
    
    // Return the result
    return {
      success: true,
      freeZoneId,
      freeZoneName,
      documentsFound: crawlResult.documents.length,
      documentsDownloaded: downloadResults.filter(r => r.downloadSuccess).length,
      documents: downloadResults,
      summaryPath
    };
  } catch (error) {
    console.error(`Error downloading documents for ${freeZoneName}:`, error.message);
    
    return {
      success: false,
      freeZoneId,
      freeZoneName,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Download documents for all free zones
 */
export async function downloadAllFreeZoneDocuments(freeZones) {
  try {
    console.log(`Starting document download for ${freeZones.length} free zones`);
    
    const results = [];
    
    for (const freeZone of freeZones) {
      if (!freeZone.website) {
        console.log(`Skipping ${freeZone.name} - no website URL`);
        results.push({
          success: false,
          freeZoneId: freeZone.id,
          freeZoneName: freeZone.name,
          error: 'No website URL'
        });
        continue;
      }
      
      console.log(`Processing ${freeZone.name} (${freeZone.website})`);
      
      const result = await downloadFreeZoneDocuments(
        freeZone.id,
        freeZone.name,
        freeZone.website
      );
      
      results.push(result);
    }
    
    return {
      success: true,
      freeZones: results,
      totalFreeZones: freeZones.length,
      successfulDownloads: results.filter(r => r.success).length,
      failedDownloads: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error('Error downloading documents for all free zones:', error.message);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}