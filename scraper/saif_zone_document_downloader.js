/**
 * SAIF Zone Document Downloader
 * 
 * This script downloads documents from the SAIF Zone website
 * and stores them in a structured directory for use as training data
 * and reference material.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { PlaywrightScraper } = require('./utils/playwright_scraper_base');

class SAIFZoneDocumentDownloader extends PlaywrightScraper {
  constructor(options = {}) {
    super({
      name: 'saif_zone_document_downloader',
      baseUrl: 'https://www.saif-zone.com',
      ...options
    });

    // Define URLs to check for documents
    this.documentPages = [
      // Main pages that might contain document links
      'https://www.saif-zone.com/en/downloads',
      'https://www.saif-zone.com/en/resources',
      'https://www.saif-zone.com/en/forms',
      'https://www.saif-zone.com/en/publications',
      // Section-specific pages
      'https://www.saif-zone.com/en/about-us',
      'https://www.saif-zone.com/en/business-activities',
      'https://www.saif-zone.com/en/facilities',
      'https://www.saif-zone.com/en/setup',
      'https://www.saif-zone.com/en/costs',
      'https://www.saif-zone.com/en/faqs'
    ];

    // Create directory structure
    this.baseDir = path.join(process.cwd(), 'saif_zone_docs');
    this.docsDir = path.join(this.baseDir, 'documents');
    this.createDirectories();

    // Track downloaded documents
    this.downloadedDocs = [];
  }

  /**
   * Create required directories
   */
  createDirectories() {
    const directories = [
      this.baseDir,
      this.docsDir,
      path.join(this.docsDir, 'forms'),
      path.join(this.docsDir, 'brochures'),
      path.join(this.docsDir, 'guidelines'),
      path.join(this.docsDir, 'applications')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Main download method
   */
  async download() {
    try {
      this.logger.info('Starting SAIF Zone document downloader');
      
      await this.initializeBrowser();
      
      // Scan each document page for downloadable files
      for (const pageUrl of this.documentPages) {
        try {
          this.logger.info(`Scanning ${pageUrl} for documents`);
          await this.extractDocumentsFromPage(pageUrl);
        } catch (error) {
          this.logger.error(`Error scanning ${pageUrl}: ${error.message}`);
        }
      }
      
      // Save download report
      this.saveDownloadReport();
      
      this.logger.info(`Completed SAIF Zone document download. Total documents: ${this.downloadedDocs.length}`);
      
      return {
        success: true,
        downloadedDocs: this.downloadedDocs
      };
    } catch (error) {
      this.logger.error(`Error in document downloader: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Extract documents from a specific page
   */
  async extractDocumentsFromPage(pageUrl) {
    try {
      await this.page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60000 });
      
      // Extract all download links
      const documentLinks = await this.page.evaluate(() => {
        const links = [];
        
        // Look for common document link patterns
        document.querySelectorAll('a[href]').forEach(link => {
          const href = link.getAttribute('href');
          const text = link.innerText.trim();
          
          // Check if it's a document link (PDF, DOC, DOCX, XLS, XLSX, etc.)
          const isDocumentLink = href.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i) ||
                                href.includes('/download/') || 
                                href.includes('/documents/') ||
                                href.includes('/files/') ||
                                href.includes('/publications/');
          
          if (isDocumentLink) {
            links.push({
              url: href,
              title: text || path.basename(href)
            });
          }
        });
        
        return links;
      });
      
      // Process and download each document
      for (const doc of documentLinks) {
        try {
          // Ensure the URL is absolute
          const documentUrl = new URL(doc.url, pageUrl).href;
          
          // Skip if already downloaded
          if (this.downloadedDocs.some(d => d.url === documentUrl)) {
            continue;
          }
          
          // Determine document type and appropriate directory
          const docType = this.determineDocumentType(doc.title, documentUrl);
          const outputDir = path.join(this.docsDir, docType);
          
          // Download the document
          const savedPath = await this.downloadDocument({
            url: documentUrl,
            title: doc.title,
            source: pageUrl
          }, outputDir);
          
          if (savedPath) {
            this.downloadedDocs.push({
              url: documentUrl,
              title: doc.title,
              path: savedPath,
              type: docType,
              source: pageUrl
            });
          }
        } catch (error) {
          this.logger.error(`Error downloading document ${doc.url}: ${error.message}`);
        }
      }
      
      this.logger.info(`Found ${documentLinks.length} documents on ${pageUrl}`);
    } catch (error) {
      this.logger.error(`Error extracting documents from ${pageUrl}: ${error.message}`);
    }
  }

  /**
   * Determine document type based on title and URL
   */
  determineDocumentType(title, url) {
    const lowerTitle = title.toLowerCase();
    const lowerUrl = url.toLowerCase();
    
    // Forms and applications
    if (
      lowerTitle.includes('form') || 
      lowerTitle.includes('application') || 
      lowerUrl.includes('form') || 
      lowerUrl.includes('application')
    ) {
      return 'forms';
    }
    
    // Brochures and marketing material
    if (
      lowerTitle.includes('brochure') || 
      lowerTitle.includes('leaflet') || 
      lowerTitle.includes('factsheet') ||
      lowerUrl.includes('brochure')
    ) {
      return 'brochures';
    }
    
    // Guidelines and procedures
    if (
      lowerTitle.includes('guide') || 
      lowerTitle.includes('procedure') || 
      lowerTitle.includes('manual') ||
      lowerTitle.includes('instruction') ||
      lowerUrl.includes('guide')
    ) {
      return 'guidelines';
    }
    
    // Default to applications
    return 'applications';
  }

  /**
   * Download a single document
   */
  async downloadDocument(document, outputDir) {
    try {
      const { url, title, source } = document;
      
      // Create a safe filename from the title
      const fileExtension = path.extname(url) || '.pdf';
      const safeTitle = title
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/__+/g, '_')
        .toLowerCase();
      
      const filename = `saif_zone_${safeTitle}${fileExtension}`;
      const outputPath = path.join(outputDir, filename);
      
      // Download the file
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      // Save the file
      const writer = fs.createWriteStream(outputPath);
      
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          this.logger.info(`Downloaded document: ${title} -> ${outputPath}`);
          resolve(outputPath);
        });
        
        writer.on('error', err => {
          this.logger.error(`Error writing file ${outputPath}: ${err.message}`);
          reject(err);
        });
      });
    } catch (error) {
      this.logger.error(`Error downloading document: ${error.message}`);
      return null;
    }
  }

  /**
   * Save download report to JSON file
   */
  saveDownloadReport() {
    try {
      const reportPath = path.join(this.baseDir, 'download_report.json');
      
      const report = {
        timestamp: new Date().toISOString(),
        totalDocuments: this.downloadedDocs.length,
        documents: this.downloadedDocs
      };
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.logger.info(`Download report saved to ${reportPath}`);
    } catch (error) {
      this.logger.error(`Error saving download report: ${error.message}`);
    }
  }
}

/**
 * Run the SAIF Zone document downloader
 */
async function downloadSAIFZoneDocuments(options = {}) {
  const downloader = new SAIFZoneDocumentDownloader(options);
  return await downloader.download();
}

module.exports = {
  SAIFZoneDocumentDownloader,
  downloadSAIFZoneDocuments
};