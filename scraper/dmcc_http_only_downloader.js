/**
 * DMCC HTTP-Only Document Downloader
 * 
 * This module provides a HTTP-only implementation for downloading DMCC documents
 * without using Playwright or any browser automation. It relies on direct HTTP
 * requests and parsing the HTML with cheerio.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Downloads DMCC documents using only HTTP requests (no browser)
 * @param {string} category - The category of documents to download
 * @param {string} baseUrl - The base URL for the document category
 * @param {string} outputDir - Directory to save the documents
 */
export async function downloadDMCCDocuments(category, baseUrl, outputDir) {
  console.log(`Starting HTTP-only DMCC document download for ${category}`);
  console.log(`Target page: ${baseUrl}`);
  console.log(`Output directory: ${outputDir}`);

  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Fetch the page content
    const response = await axios.get(baseUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    });

    // Parse HTML with cheerio
    const $ = cheerio.load(response.data);

    // Create a metadata file to store information about the documents
    const metadataFile = path.join(outputDir, '_metadata.json');
    const metadata = {
      category,
      baseUrl,
      documents: []
    };

    // Find all documents on the page
    // Look for common document links and download buttons
    const documentLinks = $('a[href$=".pdf"], a.document-download, a.download-link, a[href*="document"], a[href*="download"]');
    
    console.log(`Found ${documentLinks.length} potential document links on the page`);

    let downloadCount = 0;
    for (let i = 0; i < documentLinks.length; i++) {
      const link = documentLinks[i];
      const url = $(link).attr('href');
      
      // Skip if not a valid URL
      if (!url || url === '#' || url === '/') continue;
      
      // Normalize URL
      const fullUrl = url.startsWith('http') ? url : new URL(url, baseUrl).href;
      
      // Get document title
      let title = $(link).text().trim();
      if (!title) {
        title = $(link).attr('title') || $(link).attr('aria-label') || path.basename(url);
      }
      
      // Clean up title and create a safe filename
      title = title.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
      if (!title) title = `document_${i + 1}`;
      
      const filename = `${title.replace(/\s+/g, '_')}.pdf`;
      const filePath = path.join(outputDir, filename);
      
      console.log(`Downloading document [${i + 1}/${documentLinks.length}]: ${title}`);
      console.log(`URL: ${fullUrl}`);
      
      try {
        // Download the file
        const fileResponse = await axios.get(fullUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        // Check if it's a PDF (or at least binary data)
        const contentType = fileResponse.headers['content-type'];
        if (contentType && (contentType.includes('pdf') || contentType.includes('octet-stream') || contentType.includes('application/'))) {
          // Save the file
          fs.writeFileSync(filePath, fileResponse.data);
          
          // Add to metadata
          metadata.documents.push({
            title,
            url: fullUrl,
            filename,
            contentType,
            size: fileResponse.data.length,
            downloadDate: new Date().toISOString()
          });
          
          downloadCount++;
          console.log(`Successfully downloaded and saved: ${filename}`);
        } else {
          console.log(`Skipping ${fullUrl} - not a downloadable document (content-type: ${contentType})`);
        }
      } catch (err) {
        console.error(`Error downloading ${fullUrl}:`, err.message);
      }
    }
    
    // Save metadata
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    
    // Create a summary document
    const summaryFilePath = path.join(outputDir, '_summary.txt');
    const summary = `DMCC ${category} Documents Summary
Download Date: ${new Date().toISOString()}
Source URL: ${baseUrl}
Total Documents Found: ${documentLinks.length}
Total Documents Downloaded: ${downloadCount}

Documents:
${metadata.documents.map((doc, idx) => `${idx + 1}. ${doc.title} (${doc.filename})`).join('\n')}
`;
    fs.writeFileSync(summaryFilePath, summary);
    
    console.log(`HTTP-only DMCC document download complete for ${category}`);
    console.log(`Downloaded ${downloadCount} documents to ${outputDir}`);
    console.log(`Metadata saved to ${metadataFile}`);
    console.log(`Summary saved to ${summaryFilePath}`);
    
    return {
      success: true,
      downloadCount,
      outputDir,
      metadata
    };
  } catch (error) {
    console.error(`Error in HTTP-only DMCC document download:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function to download all DMCC document categories
 */
export async function downloadAllDMCCDocuments() {
  const categories = [
    {
      name: 'managing_your_business',
      url: 'https://dmcc.ae/members/support/knowledge-bank/managing-your-business',
      dir: 'dmcc_docs/managing_your_business'
    },
    {
      name: 'setting_up_a_company',
      url: 'https://dmcc.ae/members/support/knowledge-bank/setting-up-a-company',
      dir: 'dmcc_docs/setting_up_a_company'
    },
    {
      name: 'visas_and_immigration',
      url: 'https://dmcc.ae/members/support/knowledge-bank/visas-and-immigration',
      dir: 'dmcc_docs/visas_and_immigration'
    }
  ];
  
  const results = [];
  
  for (const category of categories) {
    console.log(`=== Processing category: ${category.name} ===`);
    const result = await downloadDMCCDocuments(category.name, category.url, category.dir);
    results.push({
      category: category.name,
      result
    });
  }
  
  return results;
}

// Export default function for direct execution
export default async function run() {
  console.log('Starting HTTP-only DMCC document downloader');
  await downloadAllDMCCDocuments();
  console.log('HTTP-only DMCC document downloader completed');
}

// Allow direct execution
if (process.argv[1] === import.meta.url) {
  run().catch(console.error);
}