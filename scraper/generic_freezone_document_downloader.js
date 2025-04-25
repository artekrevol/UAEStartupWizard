/**
 * Generic Free Zone Document Downloader
 * 
 * This script downloads documents from any free zone website.
 * It detects common document patterns and downloads PDFs, guides, forms and other
 * document types into appropriate category folders.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { db } = require('../server/db');
const { PlaywrightScraper } = require('./utils/playwright_scraper');

class GenericFreeZoneDocumentDownloader extends PlaywrightScraper {
  constructor(options = {}) {
    super(options);
    this.freeZoneId = options.freeZoneId;
    this.freeZoneName = options.freeZoneName;
    this.websiteUrl = options.websiteUrl;
    this.maxDocuments = options.maxDocuments || 50; // Limit documents to prevent excessive downloads
    this.baseOutputDir = options.outputDir || path.resolve(`./freezone_docs/${this.freeZoneName.toLowerCase().replace(/\s+/g, '_')}`);
    this.downloadedUrls = new Set(); // Track downloaded URLs to prevent duplicates
    this.documentsByCategory = {};
    this.totalDownloaded = 0;
    
    // Common document extensions
    this.documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.txt'];
    
    // Common document path keywords by category
    this.categoryKeywords = {
      'business_setup': ['setup', 'establish', 'register', 'incorporate', 'formation', 'start', 'company'],
      'legal': ['legal', 'law', 'regulation', 'compliance', 'rules'],
      'financial': ['financial', 'finance', 'banking', 'tax', 'vat', 'payment'],
      'visa': ['visa', 'residence', 'immigration', 'employment'],
      'license': ['license', 'permit', 'activity', 'business type'],
      'trade': ['trade', 'import', 'export', 'customs', 'logistics'],
      'forms': ['form', 'application', 'template', 'document'],
      'compliance': ['compliance', 'kyc', 'aml', 'policy'],
      'knowledge_bank': ['guide', 'manual', 'handbook', 'knowledge']
    };
  }

  /**
   * Main scrape method to download documents
   */
  async scrape() {
    console.log(`Starting document download for ${this.freeZoneName} (${this.websiteUrl})`);
    
    if (!this.websiteUrl) {
      console.error(`No website URL provided for ${this.freeZoneName}`);
      return { success: false, message: 'No website URL provided' };
    }
    
    // Create base output directory
    if (!fs.existsSync(this.baseOutputDir)) {
      fs.mkdirSync(this.baseOutputDir, { recursive: true });
    }
    
    // Initialize category directories
    Object.keys(this.categoryKeywords).forEach(category => {
      const categoryDir = path.join(this.baseOutputDir, category);
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }
      this.documentsByCategory[category] = [];
    });
    
    try {
      // Launch browser
      this.browser = await chromium.launch({ 
        headless: true,
        executablePath: process.env.PLAYWRIGHT_BROWSERS_PATH || undefined
      });
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        viewport: { width: 1366, height: 768 }
      });
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(60000);
      
      // Visit main page
      console.log(`Visiting ${this.websiteUrl}`);
      await this.page.goto(this.websiteUrl, { waitUntil: 'domcontentloaded' });
      
      // Build sitemap with key pages
      const sitemap = await this.buildSitemap();
      
      // Process main page first
      await this.processPageForDocuments(this.websiteUrl, 'root');
      
      // Process key sections from sitemap
      for (const [section, url] of Object.entries(sitemap)) {
        if (this.totalDownloaded >= this.maxDocuments) {
          console.log(`Reached maximum document limit (${this.maxDocuments}). Stopping.`);
          break;
        }
        
        if (this.downloadedUrls.has(url)) continue;
        
        await this.processPageForDocuments(url, section);
      }
      
      // Generate summary
      const summary = {
        freeZoneId: this.freeZoneId,
        freeZoneName: this.freeZoneName,
        websiteUrl: this.websiteUrl,
        totalDocuments: this.totalDownloaded,
        documentsByCategory: Object.fromEntries(
          Object.entries(this.documentsByCategory).map(
            ([category, docs]) => [category, docs.length]
          )
        ),
        documents: Object.values(this.documentsByCategory).flat()
      };
      
      // Save summary to file
      fs.writeFileSync(
        path.join(this.baseOutputDir, 'download_summary.json'), 
        JSON.stringify(summary, null, 2)
      );
      
      console.log(`Downloaded ${this.totalDownloaded} documents from ${this.freeZoneName}`);
      return {
        success: true,
        totalDocuments: this.totalDownloaded,
        documentsByCategory: summary.documentsByCategory,
        outputDir: this.baseOutputDir
      };
      
    } catch (error) {
      console.error(`Error in document scraper for ${this.freeZoneName}:`, error);
      return { success: false, error: error.message };
    } finally {
      // Close browser
      if (this.browser) await this.browser.close();
    }
  }
  
  /**
   * Build a sitemap of important pages to scan
   */
  async buildSitemap() {
    console.log('Building sitemap of key pages');
    const sitemap = {};
    
    try {
      // Get all navigation links
      const navLinks = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('nav a, header a, .menu a, .navigation a, [role="navigation"] a'))
          .map(a => {
            const href = a.getAttribute('href');
            const text = a.textContent?.trim().toLowerCase();
            return { href, text };
          })
          .filter(link => link.href && link.text);
          
        return links;
      });
      
      // Keywords for important sections
      const importantSections = [
        'business', 'setup', 'license', 'services', 'document', 'download', 
        'form', 'guide', 'apply', 'establish', 'company', 'registration',
        'visa', 'permit', 'legal', 'regulation', 'compliance', 'trade',
        'resource', 'knowledge', 'support'
      ];
      
      // Process navigation links
      for (const link of navLinks) {
        if (!link.href || !link.text) continue;
        
        // Check if link text matches important sections
        const matchesImportant = importantSections.some(keyword => 
          link.text.includes(keyword)
        );
        
        if (matchesImportant) {
          let fullUrl = link.href;
          
          // Handle relative URLs
          if (link.href.startsWith('/') || !link.href.startsWith('http')) {
            fullUrl = new URL(link.href, this.websiteUrl).href;
          }
          
          // Only include links from the same domain
          if (fullUrl.includes(new URL(this.websiteUrl).hostname)) {
            // Use link text as section name
            const sectionName = link.text.replace(/\W+/g, '_').toLowerCase();
            sitemap[sectionName] = fullUrl;
          }
        }
      }
      
      console.log(`Found ${Object.keys(sitemap).length} important sections`);
      return sitemap;
      
    } catch (error) {
      console.error('Error building sitemap:', error);
      return {};
    }
  }
  
  /**
   * Process a page for documents
   */
  async processPageForDocuments(url, section) {
    if (this.totalDownloaded >= this.maxDocuments) return;
    
    console.log(`Processing ${section} page: ${url}`);
    
    try {
      // Visit page
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      this.downloadedUrls.add(url);
      
      // Extract document links
      const documentLinks = await this.extractDocumentLinks();
      
      if (documentLinks.length === 0) {
        console.log(`No document links found on ${url}`);
        return;
      }
      
      console.log(`Found ${documentLinks.length} document links on ${url}`);
      
      // Download documents with rate limiting
      for (const doc of documentLinks) {
        if (this.totalDownloaded >= this.maxDocuments) break;
        
        // Determine document category
        const category = this.determineDocumentCategory(doc.title, doc.url, section);
        
        // Download document
        const result = await this.downloadDocument(doc, category);
        
        if (result.success) {
          this.totalDownloaded++;
          this.documentsByCategory[category].push({
            title: doc.title,
            url: doc.url,
            filePath: result.filePath,
            category: category,
            fileType: result.fileType,
            size: result.size,
            downloadDate: new Date().toISOString()
          });
          
          // Add small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
    } catch (error) {
      console.error(`Error processing page ${url}:`, error);
    }
  }
  
  /**
   * Extract document links from current page
   */
  async extractDocumentLinks() {
    try {
      // Get document links using Playwright
      const documentLinks = await this.page.evaluate((extensions) => {
        const links = [];
        
        // Function to check if URL has document extension
        const hasDocumentExtension = (url) => {
          return extensions.some(ext => url.toLowerCase().endsWith(ext));
        };
        
        // First, look for obvious download links
        document.querySelectorAll('a[href]').forEach(a => {
          const href = a.getAttribute('href');
          if (!href) return;
          
          // Skip empty, javascript, or mailto links
          if (href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
          
          // Check if it's a document link by extension
          const isDocumentByExt = hasDocumentExtension(href);
          
          // Check if it has download indicators in text or classes
          const hasDownloadIndicator = 
            a.textContent?.toLowerCase().match(/download|form|document|guide|pdf|template/i) ||
            a.className.toLowerCase().match(/download|pdf|doc|file/i) ||
            a.querySelector('img[src*="pdf" i], img[src*="doc" i], img[src*="download" i]') !== null;
          
          // Get title from text content or image alt
          let title = a.textContent?.trim();
          if (!title || title.length < 2) {
            const img = a.querySelector('img[alt]');
            if (img && img.getAttribute('alt')) {
              title = img.getAttribute('alt').trim();
            }
          }
          
          // If it's clearly a document or has download indicators
          if (isDocumentByExt || hasDownloadIndicator) {
            if (!title || title.length < 2) {
              // Try to extract filename from href as fallback title
              const urlParts = href.split('/');
              const fileName = urlParts[urlParts.length - 1].split('?')[0];
              title = decodeURIComponent(fileName).replace(/\\+/g, ' ');
            }
            
            links.push({
              title: title || 'Untitled Document',
              url: href,
              type: isDocumentByExt ? 'document' : 'download',
              element: a.outerHTML
            });
          }
        });
        
        return links;
      }, this.documentExtensions);
      
      // Process and normalize links
      return documentLinks.map(link => {
        // Normalize URL (handle relative paths)
        let fullUrl = link.url;
        if (link.url.startsWith('/') || !link.url.startsWith('http')) {
          fullUrl = new URL(link.url, this.websiteUrl).href;
        }
        
        // Clean up title
        const title = link.title
          .replace(/\s+/g, ' ')
          .replace(/[\\/:*?"<>|]/g, '_')
          .trim();
        
        return {
          ...link,
          url: fullUrl,
          title: title || 'Untitled Document'
        };
      });
      
    } catch (error) {
      console.error('Error extracting document links:', error);
      return [];
    }
  }
  
  /**
   * Determine the best category for a document
   */
  determineDocumentCategory(title, url, section) {
    const textToAnalyze = `${title} ${url} ${section}`.toLowerCase();
    
    // Check each category's keywords against the text
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      for (const keyword of keywords) {
        if (textToAnalyze.includes(keyword)) {
          return category;
        }
      }
    }
    
    // Default to knowledge_bank if no category matches
    return 'knowledge_bank';
  }
  
  /**
   * Download a document
   */
  async downloadDocument(document, category) {
    const { title, url } = document;
    
    // Skip if already downloaded
    if (this.downloadedUrls.has(url)) {
      return { success: false, message: 'Already downloaded' };
    }
    
    try {
      // Determine file extension
      let fileExt = '.pdf'; // Default
      const urlLower = url.toLowerCase();
      
      // Extract extension from URL
      for (const ext of this.documentExtensions) {
        if (urlLower.endsWith(ext)) {
          fileExt = ext;
          break;
        }
      }
      
      // Generate safe filename
      const safeTitle = title
        .replace(/[\\/:*?"<>|]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100); // Limit length
      
      const fileName = `${safeTitle}_${Date.now()}${fileExt}`;
      const outputPath = path.join(this.baseOutputDir, category, fileName);
      
      console.log(`Downloading document: ${title} (${url})`);
      
      // Download file
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
        }
      });
      
      // Check if response is valid
      if (response.status !== 200) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      // Save file
      fs.writeFileSync(outputPath, response.data);
      
      // Mark as downloaded
      this.downloadedUrls.add(url);
      
      // Get file size
      const stats = fs.statSync(outputPath);
      const fileSizeKB = Math.round(stats.size / 1024);
      
      console.log(`Successfully downloaded: ${outputPath} (${fileSizeKB} KB)`);
      
      return {
        success: true,
        title,
        url,
        filePath: outputPath,
        fileType: fileExt.replace('.', ''),
        size: fileSizeKB,
        category
      };
      
    } catch (error) {
      console.error(`Error downloading document ${url}:`, error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Run the document downloader for a specific free zone
 */
async function downloadFreeZoneDocuments(freeZoneId) {
  try {
    // Get free zone details from database
    const freeZoneQuery = await db.execute(`
      SELECT id, name, website FROM free_zones WHERE id = ${freeZoneId}
    `);
    
    if (!freeZoneQuery.rows || freeZoneQuery.rows.length === 0) {
      console.error(`Free zone with ID ${freeZoneId} not found`);
      return { success: false, message: 'Free zone not found' };
    }
    
    const freeZone = freeZoneQuery.rows[0];
    
    if (!freeZone.website) {
      console.error(`Free zone ${freeZone.name} has no website URL`);
      return { success: false, message: 'Free zone has no website URL' };
    }
    
    // Initialize and run downloader
    const downloader = new GenericFreeZoneDocumentDownloader({
      freeZoneId: freeZone.id,
      freeZoneName: freeZone.name,
      websiteUrl: freeZone.website
    });
    
    const result = await downloader.scrape();
    
    return {
      ...result,
      freeZoneId: freeZone.id,
      freeZoneName: freeZone.name
    };
    
  } catch (error) {
    console.error(`Error in downloadFreeZoneDocuments:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Download documents from all free zones
 */
async function downloadAllFreeZoneDocuments() {
  try {
    // Get all free zones with websites
    const freeZonesQuery = await db.execute(`
      SELECT id, name, website FROM free_zones 
      WHERE website IS NOT NULL AND website != ''
    `);
    
    if (!freeZonesQuery.rows || freeZonesQuery.rows.length === 0) {
      console.error('No free zones with websites found');
      return { success: false, message: 'No free zones with websites found' };
    }
    
    console.log(`Found ${freeZonesQuery.rows.length} free zones with websites`);
    
    const results = [];
    
    // Process each free zone with rate limiting
    for (const freeZone of freeZonesQuery.rows) {
      console.log(`\n========== Processing ${freeZone.name} ==========\n`);
      
      const result = await downloadFreeZoneDocuments(freeZone.id);
      results.push({
        freeZoneId: freeZone.id,
        freeZoneName: freeZone.name,
        success: result.success,
        totalDocuments: result.totalDocuments || 0,
        error: result.error
      });
      
      // Add delay between free zones to avoid overloading
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Generate summary
    const summary = {
      totalFreeZones: results.length,
      successfulDownloads: results.filter(r => r.success).length,
      failedDownloads: results.filter(r => !r.success).length,
      totalDocumentsDownloaded: results.reduce((sum, r) => sum + (r.totalDocuments || 0), 0),
      results
    };
    
    // Save summary to file
    fs.writeFileSync(
      path.resolve('./freezone_docs/all_downloads_summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    console.log(`\n===== Document Download Summary =====`);
    console.log(`Total Free Zones: ${summary.totalFreeZones}`);
    console.log(`Successful Downloads: ${summary.successfulDownloads}`);
    console.log(`Failed Downloads: ${summary.failedDownloads}`);
    console.log(`Total Documents: ${summary.totalDocumentsDownloaded}`);
    
    return summary;
    
  } catch (error) {
    console.error('Error in downloadAllFreeZoneDocuments:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  GenericFreeZoneDocumentDownloader,
  downloadFreeZoneDocuments,
  downloadAllFreeZoneDocuments
};