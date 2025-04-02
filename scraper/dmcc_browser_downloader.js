/**
 * DMCC Browser-Based Document Downloader
 * 
 * This script uses Playwright to handle JavaScript-heavy pages and download
 * documents from the DMCC knowledge bank.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { chromium } from 'playwright';

const DMCC_URL = 'https://dmcc.ae/members/support/knowledge-bank/managing-your-business';
const OUTPUT_DIR = path.join(process.cwd(), 'dmcc_docs/managing_your_business');

// Create the output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Download a file using Axios
 */
async function downloadFile(url, outputPath) {
  try {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading file from ${url}:`, error);
    throw error;
  }
}

/**
 * Main function to download documents using Playwright
 */
async function downloadDocumentsWithBrowser() {
  let browser;
  try {
    console.log('Starting browser-based document downloader...');
    console.log(`Target page: ${DMCC_URL}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
    
    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to the page
    await page.goto(DMCC_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Page loaded. Waiting for content...');
    
    // Wait for the publication list to load
    await page.waitForSelector('.publications-list', { timeout: 30000 });
    console.log('Content loaded. Extracting document information...');
    
    // Extract document information using browser context
    const documents = await page.evaluate(() => {
      const docs = [];
      
      document.querySelectorAll('.publications-list .publication-card').forEach(card => {
        const titleElement = card.querySelector('.publication-card__title');
        const title = titleElement ? titleElement.textContent.trim() : '';
        
        const linkElement = card.querySelector('a.publication-card__download-link');
        const downloadUrl = linkElement ? linkElement.getAttribute('href') : '';
        
        const categoryElement = card.querySelector('.publication-card__category');
        const category = categoryElement ? categoryElement.textContent.trim() : 'Uncategorized';
        
        const dateElement = card.querySelector('.publication-card__date');
        const date = dateElement ? dateElement.textContent.trim() : 'Unknown';
        
        // Extract any description if available
        const descriptionElement = card.querySelector('.publication-card__description');
        const description = descriptionElement ? descriptionElement.textContent.trim() : '';
        
        if (title && downloadUrl) {
          docs.push({
            title,
            downloadUrl: new URL(downloadUrl, 'https://dmcc.ae').href,
            category,
            date,
            description
          });
        }
      });
      
      return docs;
    });
    
    console.log(`Found ${documents.length} documents on the page`);
    
    // Create document index
    const indexPath = path.join(OUTPUT_DIR, 'document_index.json');
    fs.writeFileSync(indexPath, JSON.stringify(documents, null, 2));
    
    // Download each document
    const results = [];
    for (const doc of documents) {
      try {
        // Sanitize category name for directory
        const categoryDir = path.join(OUTPUT_DIR, doc.category.replace(/[^a-zA-Z0-9]/g, '_'));
        if (!fs.existsSync(categoryDir)) {
          fs.mkdirSync(categoryDir, { recursive: true });
        }
        
        // Sanitize filename
        let filename = doc.title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
        
        // Determine file extension
        const urlExtension = path.extname(doc.downloadUrl).toLowerCase();
        const extension = urlExtension || '.pdf'; // Default to PDF
        
        filename = `${filename}${extension}`;
        const outputPath = path.join(categoryDir, filename);
        
        console.log(`Downloading: ${doc.title}`);
        console.log(`URL: ${doc.downloadUrl}`);
        console.log(`Output: ${outputPath}`);
        
        // Download the file
        await downloadFile(doc.downloadUrl, outputPath);
        
        // Create metadata file
        const metadataPath = path.join(categoryDir, `${filename}.metadata.json`);
        fs.writeFileSync(metadataPath, JSON.stringify({
          ...doc,
          downloadDate: new Date().toISOString(),
          localPath: outputPath
        }, null, 2));
        
        results.push({
          title: doc.title,
          url: doc.downloadUrl,
          outputPath,
          success: true
        });
        
        console.log(`Successfully downloaded: ${doc.title}`);
      } catch (error) {
        console.error(`Failed to download ${doc.title}:`, error);
        
        results.push({
          title: doc.title,
          url: doc.downloadUrl,
          success: false,
          error: error.message
        });
      }
    }
    
    // Write results summary
    const resultsPath = path.join(OUTPUT_DIR, 'download_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Download process completed. Successfully downloaded ${successCount} of ${documents.length} documents.`);
    
    return {
      success: true,
      totalDocuments: documents.length,
      downloadedDocuments: successCount,
      outputDirectory: OUTPUT_DIR
    };
  } catch (error) {
    console.error('Error in browser-based document download:', error);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Export the function
export { downloadDocumentsWithBrowser };

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadDocumentsWithBrowser()
    .then(result => {
      if (result.success) {
        console.log('DMCC document download completed successfully');
        console.log(`Downloaded ${result.downloadedDocuments} of ${result.totalDocuments} documents to ${result.outputDirectory}`);
        process.exit(0);
      } else {
        console.error('DMCC document download failed:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unexpected error during DMCC document download:', err);
      process.exit(1);
    });
}