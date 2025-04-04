/**
 * SAIF Zone Business Setup Specialized Scraper (Simplified Version)
 * 
 * This scraper focuses specifically on extracting comprehensive information
 * about the business setup process in SAIF Zone (Sharjah Airport International Free Zone)
 * using simplified, widely compatible selectors
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { PlaywrightScraper } from './utils/playwright_scraper_base.js';

class SAIFZoneScraperSimplified extends PlaywrightScraper {
  constructor(options = {}) {
    super({
      name: 'saif_zone_scraper_simplified',
      baseUrl: 'https://www.saif-zone.com',
      ...options
    });

    // Define URLs for business setup sections
    this.urls = {
      businessSetup: 'https://www.saif-zone.com/en/business-set-up/',
      companyFormation: 'https://www.saif-zone.com/en/business-set-up/company-formation/',
      packageOptions: 'https://www.saif-zone.com/en/business-set-up/package-options/',
      legalStructure: 'https://www.saif-zone.com/en/business-set-up/legal-structure/',
      licensing: 'https://www.saif-zone.com/en/business-set-up/licensing/'
    };

    // Initialize data structure
    this.data = {
      name: 'Sharjah Airport International Free Zone (SAIF Zone)',
      setup: {
        overview: '',
        steps: [],
        requirements: [],
        documents: [],
        timeline: ''
      },
      companyFormation: {
        process: [],
        requirements: [],
        documents: []
      },
      packageOptions: {
        packages: [],
        comparison: {}
      },
      legalStructure: {
        types: [],
        requirements: {}
      },
      licensing: {
        types: [],
        activities: [],
        requirements: {}
      }
    };

    // Create directory for SAIF Zone business setup data
    this.dataDir = path.join(process.cwd(), 'saif_zone_docs', 'business_setup');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Track scraping status
    this.scrapingCompleted = false;
  }

  /**
   * Main scrape method
   */
  async scrape() {
    try {
      console.log('Starting SAIF Zone Business Setup scraper (simplified version)');
      
      await this.initialize();
      
      // Extract business setup data using simplified selectors
      console.log('Extracting SAIF Zone business setup data...');
      await this.extractAllData();
      
      // Save extracted data to JSON file for reference
      this.saveDataToFile();
      
      // Create text files with formatted content
      this.createFormattedFiles();
      
      console.log('SAIF Zone business setup scraping completed successfully');
      
      return {
        success: true,
        data: this.data
      };
    } catch (error) {
      console.error(`Error scraping SAIF Zone business setup: ${error.message}`);
      console.error(error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    } finally {
      try {
        await this.cleanup();
      } catch (cleanupError) {
        console.error(`Error during cleanup: ${cleanupError.message}`);
      }
    }
  }

  /**
   * Extract all required data from SAIF Zone business setup pages
   */
  async extractAllData() {
    // Extract main business setup page with simplified selectors
    console.log('Extracting business setup overview');
    await this.extractBusinessSetupSimplified();
    
    // Extract company formation process with simplified selectors
    console.log('Extracting company formation process');
    await this.extractCompanyFormationSimplified();
    
    // Extract package options with simplified selectors
    console.log('Extracting package options');
    await this.extractPackageOptionsSimplified();
    
    // Extract legal structure information with simplified selectors
    console.log('Extracting legal structure information');
    await this.extractLegalStructureSimplified();
    
    // Extract licensing information with simplified selectors
    console.log('Extracting licensing information');
    await this.extractLicensingSimplified();
  }

  /**
   * Extract information from the main business setup page using simplified selectors
   */
  async extractBusinessSetupSimplified() {
    try {
      await this.navigateTo(this.urls.businessSetup);
      
      // Extract introduction/overview - get all p tags from main content
      const overview = await this.page.evaluate(() => {
        const paragraphs = document.querySelectorAll('.main-content p, .content p, article p');
        if (paragraphs.length > 0) {
          // Get first 3 paragraphs
          return Array.from(paragraphs).slice(0, 3).map(p => p.innerText.trim()).join('\n\n');
        }
        return '';
      });
      
      this.data.setup.overview = overview;
      console.log('Extracted overview:', overview.substring(0, 150) + '...');
      
      // Extract setup steps - get all li elements
      const steps = await this.page.evaluate(() => {
        const listItems = document.querySelectorAll('.main-content li, .content li, article li, ol li, ul li');
        return Array.from(listItems).map(li => li.innerText.trim());
      });
      
      this.data.setup.steps = steps;
      console.log(`Extracted ${steps.length} setup steps`);
      
      // Find requirements by looking for paragraphs that contain the word "requirement"
      const requirements = await this.page.evaluate(() => {
        const allParagraphs = document.querySelectorAll('p');
        let requirementParagraphs = [];
        
        // Find paragraphs that mention requirements
        for (const p of allParagraphs) {
          if (p.innerText.toLowerCase().includes('require')) {
            requirementParagraphs.push(p);
          }
        }
        
        // Look for the nearest list after these paragraphs
        let requirementItems = [];
        for (const p of requirementParagraphs) {
          let nextElement = p.nextElementSibling;
          while (nextElement && !nextElement.matches('ul, ol') && requirementItems.length === 0) {
            if (nextElement.matches('ul, ol')) {
              requirementItems = Array.from(nextElement.querySelectorAll('li')).map(li => li.innerText.trim());
              break;
            }
            nextElement = nextElement.nextElementSibling;
          }
        }
        
        // If we didn't find a list, return paragraphs content
        return requirementItems.length > 0 ? requirementItems : 
               requirementParagraphs.map(p => p.innerText.trim());
      });
      
      this.data.setup.requirements = requirements;
      console.log(`Extracted ${requirements.length} requirements`);
      
      // Find documents by looking for list items that contain document-related words
      const documents = await this.page.evaluate(() => {
        const allListItems = document.querySelectorAll('li');
        return Array.from(allListItems)
          .filter(li => {
            const text = li.innerText.toLowerCase();
            return text.includes('document') || 
                   text.includes('passport') || 
                   text.includes('certificate') || 
                   text.includes('form') || 
                   text.includes('license');
          })
          .map(li => li.innerText.trim());
      });
      
      this.data.setup.documents = documents;
      console.log(`Extracted ${documents.length} document requirements`);
      
    } catch (error) {
      console.error(`Error extracting business setup overview: ${error.message}`);
    }
  }

  /**
   * Extract company formation information using simplified selectors
   */
  async extractCompanyFormationSimplified() {
    try {
      await this.navigateTo(this.urls.companyFormation);
      
      // Extract formation process steps
      const formationProcess = await this.page.evaluate(() => {
        const listItems = document.querySelectorAll('ol li, ul li, .steps li, .process li');
        return Array.from(listItems).map(li => li.innerText.trim());
      });
      
      this.data.companyFormation.process = formationProcess;
      console.log(`Extracted ${formationProcess.length} company formation steps`);
      
      // Extract requirements 
      const requirements = await this.page.evaluate(() => {
        // Find headers that mention requirements
        const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let requirementHeader = null;
        
        for (const header of headers) {
          if (header.innerText.toLowerCase().includes('requirement')) {
            requirementHeader = header;
            break;
          }
        }
        
        if (requirementHeader) {
          // Find the closest list after the header
          let currentElement = requirementHeader.nextElementSibling;
          while (currentElement && !currentElement.matches('ul, ol')) {
            currentElement = currentElement.nextElementSibling;
          }
          
          if (currentElement && currentElement.matches('ul, ol')) {
            return Array.from(currentElement.querySelectorAll('li')).map(li => li.innerText.trim());
          }
        }
        
        // Fallback: look for list items that mention "require"
        const allListItems = document.querySelectorAll('li');
        return Array.from(allListItems)
          .filter(li => li.innerText.toLowerCase().includes('require'))
          .map(li => li.innerText.trim());
      });
      
      this.data.companyFormation.requirements = requirements;
      console.log(`Extracted ${requirements.length} company formation requirements`);
      
      // Extract document requirements
      const documents = await this.page.evaluate(() => {
        // Find headers that mention documents
        const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let documentHeader = null;
        
        for (const header of headers) {
          if (header.innerText.toLowerCase().includes('document')) {
            documentHeader = header;
            break;
          }
        }
        
        if (documentHeader) {
          // Find the closest list after the header
          let currentElement = documentHeader.nextElementSibling;
          while (currentElement && !currentElement.matches('ul, ol')) {
            currentElement = currentElement.nextElementSibling;
          }
          
          if (currentElement && currentElement.matches('ul, ol')) {
            return Array.from(currentElement.querySelectorAll('li')).map(li => li.innerText.trim());
          }
        }
        
        // Fallback: look for list items that mention document-related terms
        const allListItems = document.querySelectorAll('li');
        return Array.from(allListItems)
          .filter(li => {
            const text = li.innerText.toLowerCase();
            return text.includes('document') || 
                  text.includes('passport') || 
                  text.includes('certificate') || 
                  text.includes('form');
          })
          .map(li => li.innerText.trim());
      });
      
      this.data.companyFormation.documents = documents;
      console.log(`Extracted ${documents.length} document requirements for company formation`);
      
    } catch (error) {
      console.error(`Error extracting company formation: ${error.message}`);
    }
  }

  /**
   * Extract package options information using simplified selectors
   */
  async extractPackageOptionsSimplified() {
    try {
      await this.navigateTo(this.urls.packageOptions);
      
      // Extract package information from tables or divs
      const packages = await this.page.evaluate(() => {
        // Try to find package cards or tables
        const packageElements = document.querySelectorAll('.package, .pricing-table, .package-option, .card, table');
        let packages = [];
        
        if (packageElements.length > 0) {
          // Process each package element
          for (const pkg of packageElements) {
            // Try to extract name, price and features
            const nameElement = pkg.querySelector('h3, h4, th, .title, .package-name');
            const priceElement = pkg.querySelector('.price, .cost, .fee');
            const featureElements = pkg.querySelectorAll('li, td, .feature');
            
            const name = nameElement ? nameElement.innerText.trim() : 'Package';
            const price = priceElement ? priceElement.innerText.trim() : '';
            const features = featureElements.length > 0 ? 
              Array.from(featureElements).map(el => el.innerText.trim()) : [];
            
            packages.push({ name, price, features });
          }
        }
        
        // If no structured packages found, look for sections with headings
        if (packages.length === 0) {
          const headings = document.querySelectorAll('h3, h4');
          for (const heading of headings) {
            if (heading.innerText.includes('Package') || 
                heading.innerText.includes('Option') || 
                heading.innerText.includes('Plan')) {
                
              // Get features from next sibling lists
              let features = [];
              let nextEl = heading.nextElementSibling;
              
              while (nextEl && !nextEl.matches('h3, h4')) {
                if (nextEl.matches('ul, ol')) {
                  features = Array.from(nextEl.querySelectorAll('li')).map(li => li.innerText.trim());
                  break;
                }
                nextEl = nextEl.nextElementSibling;
              }
              
              packages.push({
                name: heading.innerText.trim(),
                features
              });
            }
          }
        }
        
        return packages;
      });
      
      this.data.packageOptions.packages = packages;
      console.log(`Extracted ${packages.length} package options`);
      
    } catch (error) {
      console.error(`Error extracting package options: ${error.message}`);
    }
  }

  /**
   * Extract legal structure information using simplified selectors
   */
  async extractLegalStructureSimplified() {
    try {
      await this.navigateTo(this.urls.legalStructure);
      
      // Extract legal structure types
      const legalStructures = await this.page.evaluate(() => {
        // Try to find structure types from headings and following content
        const headings = document.querySelectorAll('h2, h3, h4');
        let structures = [];
        
        for (const heading of headings) {
          // Look for headings that might indicate a legal structure type
          const text = heading.innerText.toLowerCase();
          if (text.includes('fze') || 
              text.includes('fzc') || 
              text.includes('establishment') || 
              text.includes('company') || 
              text.includes('branch') || 
              text.includes('structure')) {
              
            // Extract description from paragraphs that follow the heading
            let description = '';
            let nextEl = heading.nextElementSibling;
            
            while (nextEl && !nextEl.matches('h2, h3, h4')) {
              if (nextEl.matches('p')) {
                description += nextEl.innerText.trim() + ' ';
              }
              nextEl = nextEl.nextElementSibling;
            }
            
            structures.push({
              name: heading.innerText.trim(),
              description: description.trim()
            });
          }
        }
        
        return structures;
      });
      
      this.data.legalStructure.types = legalStructures;
      console.log(`Extracted ${legalStructures.length} legal structure types`);
      
    } catch (error) {
      console.error(`Error extracting legal structure information: ${error.message}`);
    }
  }

  /**
   * Extract licensing information using simplified selectors
   */
  async extractLicensingSimplified() {
    try {
      await this.navigateTo(this.urls.licensing);
      
      // Extract license types
      const licenseTypes = await this.page.evaluate(() => {
        // Try to find license types from headings and following content
        const headings = document.querySelectorAll('h2, h3, h4');
        let types = [];
        
        for (const heading of headings) {
          // Look for headings that might indicate a license type
          const text = heading.innerText.toLowerCase();
          if (text.includes('license') || 
              text.includes('commercial') || 
              text.includes('industrial') || 
              text.includes('service')) {
              
            // Extract description from paragraphs that follow the heading
            let description = '';
            let activities = [];
            let nextEl = heading.nextElementSibling;
            
            while (nextEl && !nextEl.matches('h2, h3, h4')) {
              if (nextEl.matches('p')) {
                description += nextEl.innerText.trim() + ' ';
              } else if (nextEl.matches('ul, ol')) {
                // Collect activities if in a list
                activities = Array.from(nextEl.querySelectorAll('li')).map(li => li.innerText.trim());
              }
              nextEl = nextEl.nextElementSibling;
            }
            
            types.push({
              name: heading.innerText.trim(),
              description: description.trim(),
              activities
            });
          }
        }
        
        return types;
      });
      
      this.data.licensing.types = licenseTypes;
      console.log(`Extracted ${licenseTypes.length} license types`);
      
      // Extract activities
      const activities = await this.page.evaluate(() => {
        // Find headings that mention activities
        const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let activityHeader = null;
        
        for (const header of headers) {
          if (header.innerText.toLowerCase().includes('activit')) {
            activityHeader = header;
            break;
          }
        }
        
        let activities = [];
        if (activityHeader) {
          // Find the closest list after the header
          let currentElement = activityHeader.nextElementSibling;
          while (currentElement && !currentElement.matches('ul, ol')) {
            currentElement = currentElement.nextElementSibling;
          }
          
          if (currentElement && currentElement.matches('ul, ol')) {
            activities = Array.from(currentElement.querySelectorAll('li')).map(li => li.innerText.trim());
          }
        }
        
        return activities;
      });
      
      this.data.licensing.activities = activities;
      console.log(`Extracted ${activities.length} business activities`);
      
    } catch (error) {
      console.error(`Error extracting licensing information: ${error.message}`);
    }
  }

  /**
   * Save extracted data to a JSON file
   */
  saveDataToFile() {
    try {
      const jsonPath = path.join(this.dataDir, 'saif_zone_business_setup.json');
      fs.writeFileSync(jsonPath, JSON.stringify(this.data, null, 2));
      console.log(`Saved data to ${jsonPath}`);
    } catch (error) {
      console.error(`Error saving data to file: ${error.message}`);
    }
  }

  /**
   * Create text files with formatted content
   */
  createFormattedFiles() {
    try {
      // Create business setup overview
      this.createTextFile('business_setup_overview.txt', this.formatBusinessSetupOverview());
      
      // Create company formation process
      this.createTextFile('company_formation_process.txt', this.formatCompanyFormation());
      
      // Create license types
      this.createTextFile('license_types.txt', this.formatLicenseTypes());
      
      // Create legal structures
      this.createTextFile('legal_structures.txt', this.formatLegalStructures());
      
      // Create package options
      this.createTextFile('package_options.txt', this.formatPackageOptions());
      
      console.log('Created formatted text files');
    } catch (error) {
      console.error(`Error creating formatted files: ${error.message}`);
    }
  }

  /**
   * Create a text file with formatted content
   */
  createTextFile(filename, content) {
    const filePath = path.join(this.dataDir, filename);
    fs.writeFileSync(filePath, content);
  }

  /**
   * Format business setup overview data as readable text
   */
  formatBusinessSetupOverview() {
    let content = '# SAIF Zone Business Setup Overview\n\n';
    
    // Add overview
    content += '## Overview\n';
    content += this.data.setup.overview + '\n\n';
    
    // Add steps
    content += '## Setup Steps\n';
    if (this.data.setup.steps.length > 0) {
      this.data.setup.steps.forEach((step, index) => {
        content += `${index + 1}. ${step}\n`;
      });
    } else {
      content += 'No specific setup steps were found on the website.\n';
    }
    content += '\n';
    
    // Add requirements
    content += '## Requirements\n';
    if (this.data.setup.requirements.length > 0) {
      this.data.setup.requirements.forEach(req => {
        content += `- ${req}\n`;
      });
    } else {
      content += 'No specific requirements were found on the website.\n';
    }
    content += '\n';
    
    // Add documents
    content += '## Required Documents\n';
    if (this.data.setup.documents.length > 0) {
      this.data.setup.documents.forEach(doc => {
        content += `- ${doc}\n`;
      });
    } else {
      content += 'No specific document requirements were found on the website.\n';
    }
    
    return content;
  }

  /**
   * Format company formation data as readable text
   */
  formatCompanyFormation() {
    let content = '# SAIF Zone Company Formation Process\n\n';
    
    // Add process steps
    content += '## Formation Process\n';
    if (this.data.companyFormation.process.length > 0) {
      this.data.companyFormation.process.forEach((step, index) => {
        content += `${index + 1}. ${step}\n`;
      });
    } else {
      content += 'No specific formation process steps were found on the website.\n';
    }
    content += '\n';
    
    // Add requirements
    content += '## Requirements\n';
    if (this.data.companyFormation.requirements.length > 0) {
      this.data.companyFormation.requirements.forEach(req => {
        content += `- ${req}\n`;
      });
    } else {
      content += 'No specific formation requirements were found on the website.\n';
    }
    content += '\n';
    
    // Add documents
    content += '## Required Documents\n';
    if (this.data.companyFormation.documents.length > 0) {
      this.data.companyFormation.documents.forEach(doc => {
        content += `- ${doc}\n`;
      });
    } else {
      content += 'No specific document requirements were found on the website.\n';
    }
    
    return content;
  }

  /**
   * Format license types data as readable text
   */
  formatLicenseTypes() {
    let content = '# SAIF Zone License Types\n\n';
    
    if (this.data.licensing.types.length > 0) {
      this.data.licensing.types.forEach(type => {
        content += `## ${type.name}\n`;
        if (type.description) {
          content += `${type.description}\n\n`;
        }
        
        if (type.activities && type.activities.length > 0) {
          content += '### Permitted Activities\n';
          type.activities.forEach(activity => {
            content += `- ${activity}\n`;
          });
          content += '\n';
        }
      });
    } else {
      content += 'No specific license type information was found on the website.\n\n';
      
      // Add general activities if available
      if (this.data.licensing.activities.length > 0) {
        content += '## General Business Activities\n';
        this.data.licensing.activities.forEach(activity => {
          content += `- ${activity}\n`;
        });
      }
    }
    
    return content;
  }

  /**
   * Format legal structures data as readable text
   */
  formatLegalStructures() {
    let content = '# SAIF Zone Legal Structures\n\n';
    
    if (this.data.legalStructure.types.length > 0) {
      this.data.legalStructure.types.forEach(type => {
        content += `## ${type.name}\n`;
        if (type.description) {
          content += `${type.description}\n\n`;
        } else {
          content += '\n';
        }
      });
    } else {
      content += 'No specific legal structure information was found on the website.\n';
    }
    
    return content;
  }

  /**
   * Format package options data as readable text
   */
  formatPackageOptions() {
    let content = '# SAIF Zone Package Options\n\n';
    
    if (this.data.packageOptions.packages.length > 0) {
      this.data.packageOptions.packages.forEach(pkg => {
        content += `## ${pkg.name}\n`;
        
        if (pkg.price) {
          content += `**Price:** ${pkg.price}\n\n`;
        }
        
        if (pkg.features && pkg.features.length > 0) {
          content += '### Features\n';
          pkg.features.forEach(feature => {
            content += `- ${feature}\n`;
          });
          content += '\n';
        }
      });
    } else {
      content += 'No specific package option information was found on the website.\n';
    }
    
    return content;
  }
}

/**
 * Run the SAIF Zone scraper simplified version
 * @param {Object} options Scraper options
 * @returns {Promise<Object>} Result of the scraping process
 */
export async function scrapeSAIFZoneSimplified(options = {}) {
  const scraper = new SAIFZoneScraperSimplified(options);
  return await scraper.scrape();
}

export {
  SAIFZoneScraperSimplified
};