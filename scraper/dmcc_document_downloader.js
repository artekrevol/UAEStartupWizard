/**
 * DMCC Knowledge Bank Document Downloader
 * 
 * This script downloads documents from the DMCC knowledge bank page
 * (https://dmcc.ae/members/support/knowledge-bank/managing-your-business)
 * and stores them in a local folder for use as training data.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import { PlaywrightScraper } from './utils/playwright_scraper_base.js';
import { chromium } from 'playwright';

class DMCCDocumentDownloader extends PlaywrightScraper {
  constructor(options = {}) {
    super({
      name: 'DMCC Document Downloader',
      baseUrl: 'https://dmcc.ae/members/support/knowledge-bank',
      ...options
    });

    this.outputDir = options.outputDir || path.join(process.cwd(), 'dmcc_docs/knowledge_bank');
    this.knowledgeBankUrls = [
      'https://dmcc.ae/members/support/knowledge-bank/managing-your-business',
      'https://dmcc.ae/members/support/knowledge-bank/finance-insurance-and-banking',
      'https://dmcc.ae/members/support/knowledge-bank/visas',
      'https://dmcc.ae/members/support/knowledge-bank/company-license',
      'https://dmcc.ae/members/support/knowledge-bank/general-services'
    ];

    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Main scrape method
   */
  async scrape() {
    console.log(`Starting DMCC document download`);
    try {
      const browser = await chromium.launch({ headless: true });
      this.browser = browser;
      this.page = await browser.newPage();

      // Process each knowledge bank category
      for (const url of this.knowledgeBankUrls) {
        const categoryName = url.split('/').pop().replace(/-/g, '_');
        const categoryDir = path.join(this.outputDir, categoryName);
        
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true });
        }
        
        await this.downloadDocumentsFromCategory(url, categoryDir);
      }

      console.log('DMCC document download completed successfully.');
      return { success: true };
    } catch (error) {
      console.error('Error during DMCC document download:', error);
      await this.fallbackDownload();
      return { success: false, error: error.message };
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Download documents from a specific category page
   */
  async downloadDocumentsFromCategory(categoryUrl, outputDir) {
    console.log(`Processing category: ${categoryUrl}`);
    try {
      await this.page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Wait for content to load
      await this.page.waitForSelector('.publications-list', { timeout: 30000 });
      
      // Get page HTML
      const content = await this.page.content();
      const $ = cheerio.load(content);
      
      // Process the document cards
      const documents = [];
      $('.publications-list .publication-card').each((index, element) => {
        const titleElement = $(element).find('.publication-card__title');
        const title = titleElement.text().trim();
        
        const linkElement = $(element).find('a.publication-card__download-link');
        const downloadUrl = linkElement.attr('href');
        
        if (title && downloadUrl) {
          documents.push({
            title,
            downloadUrl: new URL(downloadUrl, 'https://dmcc.ae').href
          });
        }
      });
      
      console.log(`Found ${documents.length} documents in category`);
      
      // Download each document
      for (const doc of documents) {
        await this.downloadDocument(doc, outputDir);
      }
      
      return documents;
    } catch (error) {
      console.error(`Error processing category ${categoryUrl}:`, error);
      return [];
    }
  }

  /**
   * Download a single document
   */
  async downloadDocument(document, outputDir) {
    try {
      const { title, downloadUrl } = document;
      
      // Clean filename and determine extension
      let filename = title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
      const urlExtension = path.extname(downloadUrl).toLowerCase();
      const extension = urlExtension || '.pdf'; // Default to pdf if no extension found
      filename = `${filename}${extension}`;
      
      const outputPath = path.join(outputDir, filename);
      
      console.log(`Downloading: ${title} -> ${outputPath}`);
      
      // Use axios to download the file
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream'
      });
      
      // Save to file
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`Successfully downloaded: ${filename}`);
          resolve(outputPath);
        });
        writer.on('error', (err) => {
          console.error(`Error writing file ${filename}:`, err);
          reject(err);
        });
      });
    } catch (error) {
      console.error(`Error downloading document ${document.title}:`, error);
      return null;
    }
  }

  /**
   * Fallback method using axios and cheerio when Playwright fails
   */
  async fallbackDownload() {
    console.log('Attempting fallback download method...');
    
    for (const url of this.knowledgeBankUrls) {
      const categoryName = url.split('/').pop().replace(/-/g, '_');
      const categoryDir = path.join(this.outputDir, categoryName);
      
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }
      
      try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        const documents = [];
        $('.publications-list .publication-card').each((index, element) => {
          const titleElement = $(element).find('.publication-card__title');
          const title = titleElement.text().trim();
          
          const linkElement = $(element).find('a.publication-card__download-link');
          const downloadUrl = linkElement.attr('href');
          
          if (title && downloadUrl) {
            documents.push({
              title,
              downloadUrl: new URL(downloadUrl, 'https://dmcc.ae').href
            });
          }
        });
        
        console.log(`Found ${documents.length} documents in category using fallback method`);
        
        // Download each document
        for (const doc of documents) {
          await this.downloadDocument(doc, categoryDir);
        }
      } catch (error) {
        console.error(`Error in fallback download for ${url}:`, error);
      }
    }
  }
}

/**
 * Run the DMCC document downloader
 */
async function downloadDMCCDocuments(options = {}) {
  const downloader = new DMCCDocumentDownloader(options);
  return await downloader.scrape();
}

// Export the function
export { downloadDMCCDocuments };

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadDMCCDocuments()
    .then(result => {
      if (result.success) {
        console.log('Document download completed successfully');
      } else {
        console.error('Document download failed:', result.error);
      }
    })
    .catch(err => {
      console.error('Unexpected error:', err);
    });
}