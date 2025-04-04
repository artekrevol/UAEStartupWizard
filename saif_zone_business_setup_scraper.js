/**
 * SAIF Zone Business Setup Page Scraper
 * 
 * This script specifically extracts business setup information from 
 * https://www.saif-zone.com/en/business-set-up/
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const TARGET_URL = 'https://www.saif-zone.com/en/business-set-up/';
const OUTPUT_DIR = path.join(process.cwd(), 'saif_zone_docs', 'business_setup');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract business setup information from the SAIF Zone website
 */
async function extractBusinessSetupInfo() {
  try {
    console.log(`Fetching content from ${TARGET_URL}...`);
    const response = await axios.get(TARGET_URL);
    const $ = cheerio.load(response.data);
    
    // Extract page title - try different selectors
    let pageTitle = $('.page-title h1, h1.entry-title, .entry-header h1').first().text().trim();
    if (!pageTitle) {
      pageTitle = $('h1').first().text().trim() || 'SAIF Zone Business Setup';
    }
    
    // Extract hero section content
    const heroContent = $('.hero-content, .entry-content, .page-content').first().text().trim();
    
    // Extract all paragraphs from the page
    const allParagraphs = [];
    $('p').each((index, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 20) { // Filter out short texts that might be labels
        allParagraphs.push(text);
      }
    });
    
    // Extract content from all div elements that might contain business setup info
    const divContent = [];
    $('.saif-cta, .saif-features, .saif-article, .business-setup, .content-section, .section').each((index, element) => {
      const text = $(element).text().replace(/\s+/g, ' ').trim();
      if (text && text.length > 50) { // Ensure it's substantial content
        divContent.push(text);
      }
    });
    
    // Extract information from tabbed content if present
    const tabbedContent = [];
    $('.tab-content, .tabs-content').each((index, element) => {
      const title = $(element).find('.tab-title, .tab-heading, h3').text().trim();
      const content = $(element).find('.tab-pane, .tab-body').text().trim();
      if (title && content) {
        tabbedContent.push({
          title,
          content
        });
      }
    });
    
    // Extract headings and create sections
    const sections = [];
    $('h2, h3').each((index, element) => {
      const heading = $(element).text().trim();
      if (heading) {
        // Get all content until the next heading
        let sectionContent = [];
        let currentElement = $(element).next();
        
        while (currentElement.length > 0 && !currentElement.is('h2, h3')) {
          if (currentElement.is('p, div, ul, ol')) {
            const text = currentElement.text().trim();
            if (text) {
              sectionContent.push(text);
            }
          }
          currentElement = currentElement.next();
        }
        
        if (sectionContent.length > 0) {
          sections.push({
            heading,
            content: sectionContent.join('\n\n')
          });
        }
      }
    });
    
    // Extract list items
    const listItems = [];
    $('li').each((index, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 5) {
        listItems.push(text);
      }
    });
    
    // Extract any business process steps
    const businessSteps = [];
    $('.steps, .process-steps, .business-steps, .timeline').find('.step, .process-item, .timeline-item').each((index, element) => {
      const stepTitle = $(element).find('h3, h4, .step-title').text().trim();
      const stepContent = $(element).find('p, .step-content').text().trim();
      if (stepTitle || stepContent) {
        businessSteps.push({
          title: stepTitle,
          content: stepContent
        });
      }
    });
    
    // Extract any contact info or CTA
    const contactInfo = $('.contact-info, .cta, .business-contact').text().trim();
    
    // Extract any features or benefits
    const features = [];
    $('.features, .benefits, .advantages, .key-points').find('.feature-item, .benefit-item, .advantage-item, .key-point').each((index, element) => {
      const featureText = $(element).text().trim();
      if (featureText) {
        features.push(featureText);
      }
    });
    
    // Compile the extracted data
    const businessSetupData = {
      title: pageTitle,
      overview: heroContent || allParagraphs.slice(0, 3).join('\n\n'),
      sections,
      divContent,
      tabbedContent,
      listItems,
      businessSteps,
      contactInfo,
      features,
      allParagraphs: allParagraphs.length > 0 ? allParagraphs : null
    };
    
    // Save as JSON
    const jsonPath = path.join(OUTPUT_DIR, 'business_setup_page.json');
    fs.writeFileSync(jsonPath, JSON.stringify(businessSetupData, null, 2));
    console.log(`Saved JSON data to ${jsonPath}`);
    
    // Create a formatted text document
    const textContent = formatBusinessSetupDocument(businessSetupData);
    const textPath = path.join(OUTPUT_DIR, 'business_setup_page.txt');
    fs.writeFileSync(textPath, textContent);
    console.log(`Saved formatted text to ${textPath}`);
    
    return {
      success: true,
      data: businessSetupData,
      files: {
        json: jsonPath,
        text: textPath
      }
    };
    
  } catch (error) {
    console.error(`Error extracting business setup information: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format the business setup data into a readable document
 */
function formatBusinessSetupDocument(data) {
  let document = `# ${data.title}\n\n`;
  
  document += '## Overview\n';
  document += data.overview + '\n\n';
  
  // Add sections if available
  if (data.sections && data.sections.length > 0) {
    data.sections.forEach(section => {
      document += `## ${section.heading}\n`;
      document += section.content + '\n\n';
    });
  }
  
  // Add tabbed content if available
  if (data.tabbedContent && data.tabbedContent.length > 0) {
    document += '## Key Services\n';
    data.tabbedContent.forEach(tab => {
      document += `### ${tab.title}\n`;
      document += tab.content + '\n\n';
    });
  }
  
  // Add business steps if available
  if (data.businessSteps && data.businessSteps.length > 0) {
    document += '## Business Setup Process\n';
    data.businessSteps.forEach((step, index) => {
      document += `### Step ${index + 1}: ${step.title}\n`;
      document += step.content + '\n\n';
    });
  }
  
  // Add features or benefits if available
  if (data.features && data.features.length > 0) {
    document += '## Key Benefits\n';
    data.features.forEach(feature => {
      document += `- ${feature}\n`;
    });
    document += '\n';
  }
  
  // Add list items if available
  if (data.listItems && data.listItems.length > 0) {
    document += '## Additional Information\n';
    data.listItems.forEach(item => {
      document += `- ${item}\n`;
    });
    document += '\n';
  }
  
  // Add contact information if available
  if (data.contactInfo) {
    document += '## Contact Information\n';
    document += data.contactInfo + '\n\n';
  }
  
  // Add relevant paragraphs if no other sections were created
  if ((!data.sections || data.sections.length === 0) && 
      (!data.tabbedContent || data.tabbedContent.length === 0) && 
      (!data.businessSteps || data.businessSteps.length === 0) && 
      data.allParagraphs && data.allParagraphs.length > 0) {
    
    document += '## Business Setup Information\n';
    data.allParagraphs.forEach(paragraph => {
      document += paragraph + '\n\n';
    });
  }
  
  // Add div content as a last resort if nothing else was available
  if ((!data.sections || data.sections.length === 0) && 
      (!data.tabbedContent || data.tabbedContent.length === 0) && 
      (!data.businessSteps || data.businessSteps.length === 0) &&
      (!data.allParagraphs || data.allParagraphs.length === 0) &&
      data.divContent && data.divContent.length > 0) {
    
    document += '## General Information\n';
    data.divContent.forEach(content => {
      document += content + '\n\n';
    });
  }
  
  document += '---\n';
  document += `Source: ${TARGET_URL}\n`;
  document += `Extracted: ${new Date().toISOString()}\n`;
  
  return document;
}

// Run the extraction
extractBusinessSetupInfo()
  .then(result => {
    if (result.success) {
      console.log('Business setup information extracted successfully.');
    } else {
      console.error('Failed to extract business setup information.');
    }
  })
  .catch(error => {
    console.error('Error running extraction:', error);
  });