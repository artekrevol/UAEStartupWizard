/**
 * DMCC Managing Your Business Document Downloader
 * 
 * This script focuses specifically on downloading documents from
 * https://dmcc.ae/members/support/knowledge-bank/managing-your-business
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

const DMCC_URL = 'https://dmcc.ae/members/support/knowledge-bank/managing-your-business';
const OUTPUT_DIR = path.join(process.cwd(), 'dmcc_docs/managing_your_business');

// Create the output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract document information from the page
 */
async function extractDocuments() {
  try {
    console.log(`Fetching page: ${DMCC_URL}`);
    const response = await axios.get(DMCC_URL);
    const $ = cheerio.load(response.data);
    
    const documents = [];
    
    // Find all PDF links
    $('a[href$=".pdf"]').each((index, element) => {
      // Extract document link
      const downloadUrl = $(element).attr('href');
      
      // Extract title from the link - take the filename part of the URL
      const urlParts = downloadUrl.split('/');
      let title = urlParts[urlParts.length - 1];
      // Remove extension and replace underscores with spaces
      title = title.replace('.pdf', '').replace(/_/g, ' ');
      
      // Try to get category from parent elements
      let category = 'Uncategorized';
      const $parents = $(element).parents();
      $parents.each((i, parent) => {
        const headingText = $(parent).find('h2, h3, h4').first().text().trim();
        if (headingText) {
          category = headingText;
          return false; // break the loop
        }
      });
      
      if (downloadUrl) {
        documents.push({
          title,
          downloadUrl,
          category,
          date: 'Unknown'
        });
      }
    });
    
    console.log(`Found ${documents.length} documents`);
    return documents;
  } catch (error) {
    console.error('Error extracting documents:', error);
    return [];
  }
}

/**
 * Download a single document
 */
async function downloadDocument(document) {
  const { title, downloadUrl, category } = document;
  
  // Create category subfolder
  const categoryDir = path.join(OUTPUT_DIR, category.replace(/[^a-zA-Z0-9]/g, '_'));
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }
  
  // Generate a clean filename
  let filename = title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  
  // Determine file extension from URL
  const urlExtension = path.extname(downloadUrl).toLowerCase();
  const extension = urlExtension || '.pdf'; // Default to PDF if no extension
  
  filename = `${filename}${extension}`;
  const outputPath = path.join(categoryDir, filename);
  
  try {
    console.log(`Downloading: ${title} -> ${outputPath}`);
    
    // Use axios to download the file
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream'
    });
    
    // Create metadata file with document info
    const metadataPath = path.join(categoryDir, `${filename}.metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(document, null, 2));
    
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
    console.error(`Error downloading document ${title}:`, error);
    return null;
  }
}

/**
 * Main function to download all documents
 */
async function downloadAllDocuments() {
  try {
    console.log('Starting DMCC Managing Your Business document download');
    
    // Extract document information
    const documents = await extractDocuments();
    if (documents.length === 0) {
      console.log('No documents found. The page structure might have changed.');
      return { success: false, message: 'No documents found' };
    }
    
    // Create a summary file
    const summaryPath = path.join(OUTPUT_DIR, 'document_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(documents, null, 2));
    
    // Download each document
    const results = [];
    for (const doc of documents) {
      try {
        const filePath = await downloadDocument(doc);
        if (filePath) {
          results.push({
            title: doc.title,
            path: filePath,
            success: true
          });
        } else {
          results.push({
            title: doc.title,
            success: false,
            error: 'Download failed'
          });
        }
      } catch (err) {
        results.push({
          title: doc.title,
          success: false,
          error: err.message
        });
      }
    }
    
    // Create a results summary
    const resultsPath = path.join(OUTPUT_DIR, 'download_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Download complete. Successfully downloaded ${successCount} of ${documents.length} documents.`);
    
    return { 
      success: true, 
      totalDocuments: documents.length,
      downloadedDocuments: successCount,
      outputDirectory: OUTPUT_DIR
    };
  } catch (error) {
    console.error('Error in document download process:', error);
    return { success: false, error: error.message };
  }
}

// Export the main function
export { downloadAllDocuments };

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadAllDocuments()
    .then(result => {
      if (result.success) {
        console.log('Document download completed successfully');
        console.log(`Downloaded ${result.downloadedDocuments} of ${result.totalDocuments} documents to ${result.outputDirectory}`);
      } else {
        console.error('Document download failed:', result.error || result.message);
      }
    })
    .catch(err => {
      console.error('Unexpected error:', err);
    });
}