/**
 * Comprehensive DMCC Document Downloader
 * 
 * This script downloads all documents from the DMCC knowledge bank and portal pages,
 * including all categories and subcategories.
 * 
 * Features:
 * - Crawls all main sections of the DMCC website to find document links
 * - Downloads documents from each section into category-specific folders
 * - Handles pagination and navigation through various content types
 * - Creates detailed metadata for each document
 * - Creates summary report of all downloaded documents
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

// Base configuration
const DMCC_BASE_URL = 'https://dmcc.ae';
const KNOWLEDGE_BANK_URL = 'https://dmcc.ae/members/support/knowledge-bank';
const PORTAL_URL = 'https://dmcc.ae/portal';
const FORMS_URL = 'https://dmcc.ae/forms';

// Output directory setup
const OUTPUT_DIR = path.join(process.cwd(), 'dmcc_docs');

// Create directory structure if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Track unique urls to avoid duplicate downloads
const processedUrls = new Set();

/**
 * Download a file using axios
 */
async function downloadFile(url, outputPath) {
  try {
    console.log(`Downloading file from ${url}`);
    
    // Make sure URL is valid
    const fullUrl = url.startsWith('http') ? url : `${DMCC_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
    
    const response = await axios({
      method: 'GET',
      url: fullUrl,
      responseType: 'stream',
      timeout: 30000, // 30 second timeout
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,*/*'
      }
    });
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write to file
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Successfully downloaded to ${outputPath}`);
        resolve(outputPath);
      });
      writer.on('error', (err) => {
        console.error(`Error writing file to ${outputPath}:`, err);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`Error downloading file from ${url}:`, error.message);
    return null;
  }
}

/**
 * Extract document links from HTML content
 */
function extractDocumentLinks($, baseUrl) {
  const documentLinks = [];
  
  // Find PDF, DOC, DOCX, XLS, XLSX, TXT links
  $('a[href$=".pdf"], a[href$=".doc"], a[href$=".docx"], a[href$=".xls"], a[href$=".xlsx"], a[href$=".txt"]').each((i, element) => {
    const href = $(element).attr('href');
    if (href && !processedUrls.has(href)) {
      // Get document title
      let title = $(element).text().trim();
      if (!title || title.length < 3) {
        // Try to get title from parent element
        title = $(element).parent().text().trim();
      }
      
      // If title is still empty or too short, use filename
      if (!title || title.length < 3) {
        const urlParts = href.split('/');
        title = urlParts[urlParts.length - 1].split('.')[0].replace(/_/g, ' ').replace(/-/g, ' ');
      }
      
      // Find category - look for headings higher up in the DOM
      let category = 'general';
      const $parents = $(element).parents();
      $parents.each((i, parent) => {
        const headingText = $(parent).find('h2, h3, h4').first().text().trim();
        if (headingText && headingText.length > 0) {
          category = headingText.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ +/g, '_').toLowerCase();
          return false; // Break loop
        }
      });
      
      // Get document type from URL extension
      const urlParts = href.split('.');
      const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].toLowerCase() : 'unknown';
      
      // Construct full URL if needed
      const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? href : '/' + href}`;
      
      documentLinks.push({
        title,
        url: fullUrl,
        category,
        extension
      });
      
      processedUrls.add(href);
    }
  });
  
  return documentLinks;
}

/**
 * Crawl a DMCC page and extract document links
 */
async function crawlPage(url, category = '') {
  try {
    console.log(`Crawling page: ${url}`);
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract document links
    let documentLinks = extractDocumentLinks($, DMCC_BASE_URL);
    
    // If category is provided, override extracted categories
    if (category) {
      documentLinks = documentLinks.map(doc => ({ ...doc, category }));
    }
    
    // Extract other page links for crawling
    const pageLinks = [];
    const currentPathParts = new URL(url).pathname.split('/');
    const depth = currentPathParts.filter(p => p).length;
    
    // Only follow links within the same section to avoid crawling the entire site
    if (depth <= 4) {
      $('a[href^="/"]').each((i, element) => {
        const href = $(element).attr('href');
        if (href && !href.includes('#') && !href.includes('?') && !processedUrls.has(href)) {
          const pathParts = href.split('/');
          // Make sure we're not going too deep
          if (pathParts.filter(p => p).length <= depth + 1) {
            const fullUrl = `${DMCC_BASE_URL}${href}`;
            pageLinks.push(fullUrl);
            processedUrls.add(href);
          }
        }
      });
    }
    
    return { documentLinks, pageLinks };
  } catch (error) {
    console.error(`Error crawling page ${url}:`, error.message);
    return { documentLinks: [], pageLinks: [] };
  }
}

/**
 * Crawl Knowledge Bank pages using Playwright (for JavaScript-heavy pages)
 */
async function crawlKnowledgeBankWithBrowser() {
  console.log('Crawling Knowledge Bank with browser automation...');
  
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to Knowledge Bank main page
    await page.goto(KNOWLEDGE_BANK_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for content to load
    await page.waitForSelector('.page-title', { timeout: 30000 });
    
    // Get all category links
    const categoryLinks = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a[href*="/knowledge-bank/"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !links.includes(href)) {
          links.push(href);
        }
      });
      return links;
    });
    
    console.log(`Found ${categoryLinks.length} category links in Knowledge Bank`);
    
    const allDocuments = [];
    
    // Process each category
    for (const categoryLink of categoryLinks) {
      const categoryUrl = categoryLink.startsWith('http') ? categoryLink : `${DMCC_BASE_URL}${categoryLink.startsWith('/') ? categoryLink : '/' + categoryLink}`;
      const category = categoryLink.split('/').pop().replace(/-/g, '_');
      
      console.log(`Processing category: ${category} (${categoryUrl})`);
      
      try {
        await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.page-title', { timeout: 30000 });
        
        // Extract document cards
        const documents = await page.evaluate(() => {
          const docs = [];
          document.querySelectorAll('.publications-list .publication-card').forEach(card => {
            const titleElement = card.querySelector('.publication-card__title');
            const title = titleElement ? titleElement.textContent.trim() : '';
            
            const linkElement = card.querySelector('a.publication-card__download-link');
            const downloadUrl = linkElement ? linkElement.getAttribute('href') : '';
            
            const categoryElement = card.querySelector('.publication-card__category');
            const subcategory = categoryElement ? categoryElement.textContent.trim() : '';
            
            const dateElement = card.querySelector('.publication-card__date');
            const date = dateElement ? dateElement.textContent.trim() : '';
            
            if (title && downloadUrl) {
              docs.push({
                title,
                url: downloadUrl,
                subcategory,
                date
              });
            }
          });
          return docs;
        });
        
        // Add category to each document
        const categoryDocuments = documents.map(doc => ({
          ...doc,
          category,
          url: doc.url.startsWith('http') ? doc.url : `${DMCC_BASE_URL}${doc.url.startsWith('/') ? doc.url : '/' + doc.url}`
        }));
        
        allDocuments.push(...categoryDocuments);
        console.log(`Found ${categoryDocuments.length} documents in category ${category}`);
      } catch (error) {
        console.error(`Error processing category ${category}:`, error.message);
      }
    }
    
    return allDocuments;
  } catch (error) {
    console.error('Error in browser crawling:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Download all documents from extracted links
 */
async function downloadDocuments(documents) {
  console.log(`Preparing to download ${documents.length} documents...`);
  
  const results = [];
  
  for (const doc of documents) {
    try {
      // Create category directory
      const categoryDir = path.join(OUTPUT_DIR, doc.category.toLowerCase());
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }
      
      // Create subcategory directory if available
      let targetDir = categoryDir;
      if (doc.subcategory) {
        const subcatDir = path.join(categoryDir, doc.subcategory.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'));
        if (!fs.existsSync(subcatDir)) {
          fs.mkdirSync(subcatDir, { recursive: true });
        }
        targetDir = subcatDir;
      }
      
      // Clean up title for filename
      const cleanTitle = doc.title
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 100); // Limit filename length
      
      // Determine file extension
      const urlParts = doc.url.split('.');
      const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].toLowerCase() : 'pdf';
      
      // Finalize filename and path
      const filename = `${cleanTitle}.${extension}`;
      const outputPath = path.join(targetDir, filename);
      
      // Skip if file already exists
      if (fs.existsSync(outputPath)) {
        console.log(`File already exists: ${outputPath}`);
        results.push({
          title: doc.title,
          url: doc.url,
          outputPath,
          category: doc.category,
          subcategory: doc.subcategory || '',
          success: true,
          skipped: true
        });
        continue;
      }
      
      // Download the file
      const filePath = await downloadFile(doc.url, outputPath);
      
      if (filePath) {
        // Create metadata file
        const metadataPath = path.join(targetDir, `${cleanTitle}.metadata.json`);
        fs.writeFileSync(metadataPath, JSON.stringify({
          title: doc.title,
          url: doc.url,
          category: doc.category,
          subcategory: doc.subcategory || '',
          date: doc.date || new Date().toISOString(),
          downloadedAt: new Date().toISOString(),
          filePath: outputPath
        }, null, 2));
        
        results.push({
          title: doc.title,
          url: doc.url,
          outputPath,
          category: doc.category,
          subcategory: doc.subcategory || '',
          success: true
        });
      } else {
        results.push({
          title: doc.title,
          url: doc.url,
          category: doc.category,
          subcategory: doc.subcategory || '',
          success: false,
          error: 'Download failed'
        });
      }
    } catch (error) {
      console.error(`Error downloading document ${doc.title}:`, error.message);
      results.push({
        title: doc.title,
        url: doc.url,
        category: doc.category,
        subcategory: doc.subcategory || '',
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Main function to run the comprehensive document download process
 */
async function downloadAllDMCCDocuments() {
  console.log('Starting comprehensive DMCC document download process...');
  
  try {
    // Collect all document links
    const allDocuments = [];
    
    // 1. Crawl Knowledge Bank pages with browser automation
    console.log('Step 1: Crawling Knowledge Bank pages with browser automation...');
    const knowledgeBankDocs = await crawlKnowledgeBankWithBrowser();
    allDocuments.push(...knowledgeBankDocs);
    
    // 2. Crawl other sections recursively
    console.log('Step 2: Crawling other DMCC pages...');
    const mainSections = [
      { url: PORTAL_URL, category: 'portal' },
      { url: FORMS_URL, category: 'forms' }
    ];
    
    for (const section of mainSections) {
      const pagesToCrawl = [section.url];
      const crawledUrls = new Set();
      
      while (pagesToCrawl.length > 0) {
        const currentUrl = pagesToCrawl.shift();
        if (crawledUrls.has(currentUrl)) continue;
        
        console.log(`Crawling: ${currentUrl}`);
        crawledUrls.add(currentUrl);
        
        const { documentLinks, pageLinks } = await crawlPage(currentUrl, section.category);
        
        // Add document links to collection
        allDocuments.push(...documentLinks);
        
        // Add new page links to crawl queue (limit to avoid crawling entire site)
        if (crawledUrls.size < 30) {
          for (const link of pageLinks) {
            if (!crawledUrls.has(link)) {
              pagesToCrawl.push(link);
            }
          }
        }
      }
    }
    
    // Log found documents
    console.log(`Total unique documents found: ${allDocuments.length}`);
    
    // Create document index
    const documentsByCategory = {};
    allDocuments.forEach(doc => {
      const category = doc.category || 'general';
      if (!documentsByCategory[category]) {
        documentsByCategory[category] = [];
      }
      documentsByCategory[category].push(doc);
    });
    
    // Write document index
    const indexPath = path.join(OUTPUT_DIR, 'document_index.json');
    fs.writeFileSync(indexPath, JSON.stringify({
      totalDocuments: allDocuments.length,
      categories: Object.keys(documentsByCategory).map(category => ({
        name: category,
        count: documentsByCategory[category].length
      })),
      documents: allDocuments
    }, null, 2));
    
    // Download all documents
    console.log('Step 3: Downloading all documents...');
    const downloadResults = await downloadDocuments(allDocuments);
    
    // Create summary report
    const successCount = downloadResults.filter(r => r.success).length;
    const skippedCount = downloadResults.filter(r => r.success && r.skipped).length;
    const failedCount = downloadResults.filter(r => !r.success).length;
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalDocuments: allDocuments.length,
      downloadedDocuments: successCount,
      skippedDocuments: skippedCount,
      failedDocuments: failedCount,
      categories: Object.keys(documentsByCategory).map(category => ({
        name: category,
        count: documentsByCategory[category].length,
        downloadedCount: downloadResults.filter(r => r.success && r.category === category).length
      }))
    };
    
    const summaryPath = path.join(OUTPUT_DIR, 'download_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    // Write detailed results
    const resultsPath = path.join(OUTPUT_DIR, 'download_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(downloadResults, null, 2));
    
    console.log('Document download process completed');
    console.log(`Total documents found: ${allDocuments.length}`);
    console.log(`Successfully downloaded: ${successCount} (${skippedCount} skipped)`);
    console.log(`Failed downloads: ${failedCount}`);
    
    return {
      success: true,
      totalDocuments: allDocuments.length,
      downloadedDocuments: successCount,
      skippedDocuments: skippedCount,
      failedDocuments: failedCount,
      categories: Object.keys(documentsByCategory).length
    };
  } catch (error) {
    console.error('Error in DMCC document download process:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export main function
export { downloadAllDMCCDocuments };

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllDMCCDocuments()
    .then(result => {
      if (result.success) {
        console.log('DMCC document download completed successfully');
        console.log(`Downloaded ${result.downloadedDocuments} of ${result.totalDocuments} documents`);
        console.log(`Skipped ${result.skippedDocuments} already existing documents`);
        console.log(`Found documents across ${result.categories} categories`);
        process.exit(0);
      } else {
        console.error('DMCC document download failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}