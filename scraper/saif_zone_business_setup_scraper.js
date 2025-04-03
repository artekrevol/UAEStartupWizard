/**
 * SAIF Zone Business Setup Specialized Scraper
 * 
 * This scraper focuses specifically on extracting comprehensive information
 * about the business setup process in SAIF Zone (Sharjah Airport International Free Zone)
 * from https://www.saif-zone.com/en/business-set-up/
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';
import { PlaywrightScraper } from './utils/playwright_scraper_base.js';

class SAIFZoneBusinessSetupScraper extends PlaywrightScraper {
  constructor(options = {}) {
    super({
      name: 'saif_zone_business_setup_scraper',
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
      console.log('Starting SAIF Zone Business Setup scraper');
      
      await this.initialize();
      
      // Extract all business setup sections
      console.log('Extracting SAIF Zone business setup data...');
      await this.extractAllData();
      
      // Save extracted data to JSON file for reference
      this.saveDataToFile();
      
      // Check if we found a free zone ID in the database
      const freeZoneId = await this.findFreeZoneId();
      
      if (freeZoneId) {
        // Update the free zone record with the business setup data
        await this.updateFreeZone(freeZoneId, this.data);
        
        // Create or update establishment guide
        await this.createOrUpdateEstablishmentGuide(this.data);
        
        console.log(`Successfully updated SAIF Zone business setup data (ID: ${freeZoneId})`);
      } else {
        console.warn('Could not find SAIF Zone in database. Please ensure it exists first.');
      }
      
      this.scrapingCompleted = true;
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
    // Extract main business setup page
    console.log('Extracting business setup overview');
    await this.extractBusinessSetup();
    
    // Extract company formation process
    console.log('Extracting company formation process');
    await this.extractCompanyFormation();
    
    // Extract package options
    console.log('Extracting package options');
    await this.extractPackageOptions();
    
    // Extract legal structure information
    console.log('Extracting legal structure information');
    await this.extractLegalStructure();
    
    // Extract licensing information
    console.log('Extracting licensing information');
    await this.extractLicensing();
  }

  /**
   * Extract information from the main business setup page
   */
  async extractBusinessSetup() {
    try {
      await this.page.goto(this.urls.businessSetup, { waitUntil: 'networkidle' });
      
      // Extract introduction/overview
      const overview = await this.page.evaluate(() => {
        const introSection = document.querySelector('.intro-content, .page-intro, .business-setup-intro');
        if (introSection) {
          return introSection.innerText.trim();
        }
        
        // Alternative: Get first few paragraphs from main content
        const paragraphs = Array.from(document.querySelectorAll('.main-content p')).slice(0, 3);
        if (paragraphs.length > 0) {
          return paragraphs.map(p => p.innerText.trim()).join('\n\n');
        }
        
        return document.querySelector('.main-content')?.innerText.trim() || '';
      });
      
      // Extract setup steps
      const setupSteps = await this.page.evaluate(() => {
        // Look for numbered steps or process lists
        const stepElements = Array.from(document.querySelectorAll('.setup-steps li, .process-steps li, .steps-list li, ol li'));
        
        if (stepElements.length > 0) {
          return stepElements.map((step, index) => ({
            step: index + 1,
            description: step.innerText.trim()
          }));
        }
        
        // Alternative: Parse headings and following paragraphs
        const stepContainers = Array.from(document.querySelectorAll('.step-item, .process-item'));
        if (stepContainers.length > 0) {
          return stepContainers.map((container, index) => {
            const title = container.querySelector('h3, h4, .step-title')?.innerText.trim();
            const description = container.querySelector('p, .step-description')?.innerText.trim();
            
            return {
              step: index + 1,
              title: title || `Step ${index + 1}`,
              description: description || ''
            };
          });
        }
        
        return [];
      });
      
      // Extract requirements
      const requirements = await this.page.evaluate(() => {
        const reqElements = Array.from(document.querySelectorAll('.requirements li, .required-items li'));
        if (reqElements.length > 0) {
          return reqElements.map(req => req.innerText.trim());
        }
        
        // Try to find a requirements section
        const reqSection = document.querySelector('#requirements, .requirements-section, section:has(h2:contains("Requirements"))');
        if (reqSection) {
          const items = Array.from(reqSection.querySelectorAll('li, p')).map(item => item.innerText.trim());
          return items.filter(item => item.length > 0);
        }
        
        return [];
      });
      
      // Extract documents required
      const documents = await this.page.evaluate(() => {
        const docElements = Array.from(document.querySelectorAll('.documents li, .required-docs li'));
        if (docElements.length > 0) {
          return docElements.map(doc => doc.innerText.trim());
        }
        
        // Try to find a documents section
        const docSection = document.querySelector('#documents, .documents-section, section:has(h2:contains("Documents"))');
        if (docSection) {
          const items = Array.from(docSection.querySelectorAll('li, p')).map(item => item.innerText.trim());
          return items.filter(item => item.length > 0);
        }
        
        return [];
      });
      
      // Extract timeline information
      const timeline = await this.page.evaluate(() => {
        const timelineSection = document.querySelector('.timeline, .process-timeline, section:has(h2:contains("Timeline"))');
        if (timelineSection) {
          return timelineSection.innerText.trim();
        }
        
        return '';
      });
      
      this.data.setup = {
        overview,
        steps: setupSteps,
        requirements,
        documents,
        timeline
      };
      
      console.log('Business setup overview extracted successfully');
    } catch (error) {
      console.error(`Error extracting business setup overview: ${error.message}`);
    }
  }

  /**
   * Extract company formation information
   */
  async extractCompanyFormation() {
    try {
      await this.page.goto(this.urls.companyFormation, { waitUntil: 'networkidle' });
      
      // Extract formation process
      const formationProcess = await this.page.evaluate(() => {
        // Look for numbered steps or process lists
        const processElements = Array.from(document.querySelectorAll('.formation-steps li, .process-steps li, ol li'));
        
        if (processElements.length > 0) {
          return processElements.map((step, index) => ({
            step: index + 1,
            description: step.innerText.trim()
          }));
        }
        
        // Alternative: Parse headings and following paragraphs
        const sections = Array.from(document.querySelectorAll('section, .content-section'));
        const process = [];
        
        sections.forEach((section, index) => {
          const heading = section.querySelector('h2, h3');
          if (heading && !heading.innerText.toLowerCase().includes('requirement')) {
            const content = Array.from(section.querySelectorAll('p')).map(p => p.innerText.trim()).join('\n\n');
            
            if (content) {
              process.push({
                step: index + 1,
                title: heading.innerText.trim(),
                description: content
              });
            }
          }
        });
        
        return process.length > 0 ? process : [];
      });
      
      // Extract requirements
      const requirements = await this.page.evaluate(() => {
        const reqElements = Array.from(document.querySelectorAll('.requirements li, .required-items li'));
        if (reqElements.length > 0) {
          return reqElements.map(req => req.innerText.trim());
        }
        
        // Try to find a requirements section
        const reqSection = document.querySelector('#requirements, .requirements-section, section:has(h2:contains("Requirements")), section:has(h2:contains("Requirement"))');
        if (reqSection) {
          const items = Array.from(reqSection.querySelectorAll('li, p')).map(item => item.innerText.trim());
          return items.filter(item => item.length > 0 && item.split(' ').length > 3);
        }
        
        return [];
      });
      
      // Extract documents required
      const documents = await this.page.evaluate(() => {
        const docElements = Array.from(document.querySelectorAll('.documents li, .required-docs li'));
        if (docElements.length > 0) {
          return docElements.map(doc => doc.innerText.trim());
        }
        
        // Try to find a documents section
        const docSection = document.querySelector('#documents, .documents-section, section:has(h2:contains("Documents")), section:has(h2:contains("Document"))');
        if (docSection) {
          const items = Array.from(docSection.querySelectorAll('li, p')).map(item => item.innerText.trim());
          return items.filter(item => item.length > 0 && item.split(' ').length > 2);
        }
        
        return [];
      });
      
      this.data.companyFormation = {
        process: formationProcess,
        requirements,
        documents
      };
      
      console.log('Company formation information extracted successfully');
    } catch (error) {
      console.error(`Error extracting company formation: ${error.message}`);
    }
  }

  /**
   * Extract package options information
   */
  async extractPackageOptions() {
    try {
      await this.page.goto(this.urls.packageOptions, { waitUntil: 'networkidle' });
      
      // Extract package options
      const packages = await this.page.evaluate(() => {
        // Look for package cards or sections
        const packageElements = Array.from(document.querySelectorAll('.package-card, .package-item, .pricing-card'));
        
        if (packageElements.length > 0) {
          return packageElements.map(pkg => {
            const name = pkg.querySelector('.package-name, .package-title, h3')?.innerText.trim();
            const price = pkg.querySelector('.package-price, .price')?.innerText.trim();
            const features = Array.from(pkg.querySelectorAll('.package-features li, .features li')).map(f => f.innerText.trim());
            
            return {
              name: name || 'Package',
              price: price || 'Contact for pricing',
              features
            };
          });
        }
        
        // Alternative: Try to extract from tables
        const tables = Array.from(document.querySelectorAll('table'));
        if (tables.length > 0) {
          // Find the package comparison table
          const packageTable = tables.find(table => {
            const headers = Array.from(table.querySelectorAll('th, thead td'));
            return headers.some(h => h.innerText.toLowerCase().includes('package'));
          });
          
          if (packageTable) {
            const headers = Array.from(packageTable.querySelectorAll('th, thead td')).map(h => h.innerText.trim());
            const rows = Array.from(packageTable.querySelectorAll('tbody tr'));
            
            const packages = [];
            
            // If table is structured with packages as columns
            if (headers.length > 1 && headers[0].toLowerCase().includes('feature')) {
              // Packages as columns
              for (let i = 1; i < headers.length; i++) {
                const packageName = headers[i];
                const features = rows.map(row => {
                  const cells = Array.from(row.querySelectorAll('td'));
                  const featureName = cells[0].innerText.trim();
                  const featureValue = cells[i]?.innerText.trim() || 'Not available';
                  return `${featureName}: ${featureValue}`;
                });
                
                packages.push({
                  name: packageName,
                  features
                });
              }
            } else {
              // Packages as rows
              rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                const packageName = cells[0].innerText.trim();
                const features = [];
                
                for (let i = 1; i < cells.length; i++) {
                  if (headers[i]) {
                    features.push(`${headers[i]}: ${cells[i].innerText.trim()}`);
                  }
                }
                
                packages.push({
                  name: packageName,
                  features
                });
              });
            }
            
            return packages;
          }
        }
        
        return [];
      });
      
      // Extract comparison table data
      const comparison = await this.page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table.comparison-table, table.package-comparison'));
        
        if (tables.length > 0) {
          const table = tables[0];
          const headers = Array.from(table.querySelectorAll('th, thead td')).map(h => h.innerText.trim());
          const rows = Array.from(table.querySelectorAll('tbody tr'));
          
          const result = {};
          
          rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const featureName = cells[0].innerText.trim();
            
            if (featureName) {
              result[featureName] = {};
              
              for (let i = 1; i < cells.length; i++) {
                if (headers[i]) {
                  result[featureName][headers[i]] = cells[i].innerText.trim();
                }
              }
            }
          });
          
          return result;
        }
        
        return {};
      });
      
      this.data.packageOptions = {
        packages,
        comparison
      };
      
      console.log('Package options extracted successfully');
    } catch (error) {
      console.error(`Error extracting package options: ${error.message}`);
    }
  }

  /**
   * Extract legal structure information
   */
  async extractLegalStructure() {
    try {
      await this.page.goto(this.urls.legalStructure, { waitUntil: 'networkidle' });
      
      // Extract legal entity types
      const legalTypes = await this.page.evaluate(() => {
        // Look for entity type sections
        const typeElements = Array.from(document.querySelectorAll('.entity-type, .legal-structure, section:has(h2, h3)'));
        
        if (typeElements.length > 0) {
          return typeElements.map(type => {
            const name = type.querySelector('h2, h3, .type-name')?.innerText.trim();
            const description = type.querySelector('p, .type-description')?.innerText.trim();
            
            return {
              name: name || 'Entity Type',
              description: description || ''
            };
          });
        }
        
        // Alternative: Try to parse from content structure
        const headings = Array.from(document.querySelectorAll('h2, h3')).filter(h => 
          !h.innerText.toLowerCase().includes('requirement') && 
          !h.innerText.toLowerCase().includes('document')
        );
        
        return headings.map(heading => {
          let description = '';
          let el = heading.nextElementSibling;
          
          while (el && !el.matches('h2, h3')) {
            if (el.tagName === 'P') {
              description += el.innerText.trim() + '\n\n';
            }
            el = el.nextElementSibling;
          }
          
          return {
            name: heading.innerText.trim(),
            description: description.trim()
          };
        });
      });
      
      // Extract requirements by entity type
      const requirements = await this.page.evaluate(() => {
        const requirementSections = {};
        
        // Try to find requirement sections for each entity type
        const entitySections = Array.from(document.querySelectorAll('.entity-type, .legal-structure, section:has(h2, h3)'));
        
        entitySections.forEach(section => {
          const entityName = section.querySelector('h2, h3, .type-name')?.innerText.trim();
          
          if (entityName) {
            // Look for requirements within this section
            const reqSection = section.querySelector('.requirements, [id*="requirement"]');
            
            if (reqSection) {
              const items = Array.from(reqSection.querySelectorAll('li')).map(li => li.innerText.trim());
              if (items.length > 0) {
                requirementSections[entityName] = items;
              }
            } else {
              // Try to find a requirements heading
              const reqHeading = Array.from(section.querySelectorAll('h4, h5')).find(h => 
                h.innerText.toLowerCase().includes('requirement')
              );
              
              if (reqHeading) {
                const items = [];
                let el = reqHeading.nextElementSibling;
                
                while (el && !el.matches('h2, h3, h4, h5')) {
                  if (el.tagName === 'LI') {
                    items.push(el.innerText.trim());
                  } else if (el.tagName === 'UL' || el.tagName === 'OL') {
                    const listItems = Array.from(el.querySelectorAll('li')).map(li => li.innerText.trim());
                    items.push(...listItems);
                  }
                  el = el.nextElementSibling;
                }
                
                if (items.length > 0) {
                  requirementSections[entityName] = items;
                }
              }
            }
          }
        });
        
        return requirementSections;
      });
      
      this.data.legalStructure = {
        types: legalTypes,
        requirements
      };
      
      console.log('Legal structure information extracted successfully');
    } catch (error) {
      console.error(`Error extracting legal structure: ${error.message}`);
    }
  }

  /**
   * Extract licensing information
   */
  async extractLicensing() {
    try {
      await this.page.goto(this.urls.licensing, { waitUntil: 'networkidle' });
      
      // Extract license types
      const licenseTypes = await this.page.evaluate(() => {
        // Look for license type sections
        const typeElements = Array.from(document.querySelectorAll('.license-type, .license-item, section:has(h2:contains("License"), h3:contains("License"))'));
        
        if (typeElements.length > 0) {
          return typeElements.map(type => {
            const name = type.querySelector('h2, h3, .type-name')?.innerText.trim();
            const description = type.querySelector('p, .type-description')?.innerText.trim();
            const activities = Array.from(type.querySelectorAll('.activities li, ul li')).map(li => li.innerText.trim());
            
            return {
              name: name || 'License Type',
              description: description || '',
              activities: activities.length > 0 ? activities : []
            };
          });
        }
        
        // Alternative: Parse from headers and content
        const licenseHeadings = Array.from(document.querySelectorAll('h2, h3')).filter(h => 
          h.innerText.toLowerCase().includes('license') && 
          !h.innerText.toLowerCase().includes('requirement')
        );
        
        return licenseHeadings.map(heading => {
          let description = '';
          let activities = [];
          let el = heading.nextElementSibling;
          
          while (el && !el.matches('h2, h3')) {
            if (el.tagName === 'P') {
              description += el.innerText.trim() + '\n\n';
            } else if (el.tagName === 'UL' || el.tagName === 'OL') {
              const items = Array.from(el.querySelectorAll('li')).map(li => li.innerText.trim());
              activities.push(...items);
            }
            el = el.nextElementSibling;
          }
          
          return {
            name: heading.innerText.trim(),
            description: description.trim(),
            activities
          };
        });
      });
      
      // Extract business activities
      const businessActivities = await this.page.evaluate(() => {
        // Try to find a business activities section
        const activitySection = document.querySelector('#activities, .activities-section, section:has(h2:contains("Activities"))');
        
        if (activitySection) {
          return Array.from(activitySection.querySelectorAll('li')).map(li => li.innerText.trim());
        }
        
        // Alternative: Look for lists in the page
        const lists = Array.from(document.querySelectorAll('ul, ol')).filter(list => 
          list.querySelectorAll('li').length > 3 && 
          !list.closest('nav')
        );
        
        if (lists.length > 0) {
          // Use the longest list as it's likely to be activities
          const longestList = lists.reduce((longest, current) => 
            current.querySelectorAll('li').length > longest.querySelectorAll('li').length ? current : longest
          , lists[0]);
          
          return Array.from(longestList.querySelectorAll('li')).map(li => li.innerText.trim());
        }
        
        return [];
      });
      
      // Extract licensing requirements
      const requirements = await this.page.evaluate(() => {
        // Try to find requirement sections for each license type
        const licenseTypeElements = Array.from(document.querySelectorAll('.license-type, .license-item, section:has(h2:contains("License"), h3:contains("License"))'));
        const requirements = {};
        
        licenseTypeElements.forEach(section => {
          const licenseName = section.querySelector('h2, h3, .type-name')?.innerText.trim();
          
          if (licenseName) {
            // Look for requirements within this section
            const reqSection = section.querySelector('.requirements, [id*="requirement"]');
            
            if (reqSection) {
              const items = Array.from(reqSection.querySelectorAll('li')).map(li => li.innerText.trim());
              if (items.length > 0) {
                requirements[licenseName] = items;
              }
            }
          }
        });
        
        // If no license-specific requirements found, look for general requirements
        if (Object.keys(requirements).length === 0) {
          const reqSection = document.querySelector('#requirements, .requirements-section, section:has(h2:contains("Requirements"))');
          
          if (reqSection) {
            const items = Array.from(reqSection.querySelectorAll('li')).map(li => li.innerText.trim());
            if (items.length > 0) {
              requirements['General'] = items;
            }
          }
        }
        
        return requirements;
      });
      
      this.data.licensing = {
        types: licenseTypes,
        activities: businessActivities,
        requirements
      };
      
      console.log('Licensing information extracted successfully');
    } catch (error) {
      console.error(`Error extracting licensing information: ${error.message}`);
    }
  }

  /**
   * Save extracted data to a JSON file
   */
  saveDataToFile() {
    try {
      const filePath = path.join(this.dataDir, 'saif_zone_business_setup.json');
      fs.writeFileSync(filePath, JSON.stringify(this.data, null, 2));
      console.log(`Data saved to ${filePath}`);
      
      // Also create text files for each major section
      this.createTextFile('business_setup_overview.txt', this.formatBusinessSetupOverview());
      this.createTextFile('company_formation_process.txt', this.formatCompanyFormation());
      this.createTextFile('license_types.txt', this.formatLicenseTypes());
      this.createTextFile('legal_structures.txt', this.formatLegalStructures());
      this.createTextFile('package_options.txt', this.formatPackageOptions());
    } catch (error) {
      console.error(`Error saving data to file: ${error.message}`);
    }
  }
  
  /**
   * Create a text file with formatted content
   */
  createTextFile(filename, content) {
    try {
      const filePath = path.join(this.dataDir, filename);
      fs.writeFileSync(filePath, content);
      console.log(`Created ${filename}`);
    } catch (error) {
      console.error(`Error creating ${filename}: ${error.message}`);
    }
  }
  
  /**
   * Format business setup overview data as readable text
   */
  formatBusinessSetupOverview() {
    let content = '# SAIF Zone Business Setup Overview\n\n';
    
    if (this.data.setup.overview) {
      content += '## Overview\n' + this.data.setup.overview + '\n\n';
    }
    
    if (this.data.setup.steps && this.data.setup.steps.length > 0) {
      content += '## Setup Process\n';
      this.data.setup.steps.forEach(step => {
        if (typeof step === 'object') {
          const title = step.title || `Step ${step.step}`;
          content += `### ${title}\n${step.description || ''}\n\n`;
        } else {
          content += `- ${step}\n`;
        }
      });
      content += '\n';
    }
    
    if (this.data.setup.requirements && this.data.setup.requirements.length > 0) {
      content += '## Requirements\n';
      this.data.setup.requirements.forEach(req => {
        content += `- ${req}\n`;
      });
      content += '\n';
    }
    
    if (this.data.setup.documents && this.data.setup.documents.length > 0) {
      content += '## Required Documents\n';
      this.data.setup.documents.forEach(doc => {
        content += `- ${doc}\n`;
      });
      content += '\n';
    }
    
    if (this.data.setup.timeline) {
      content += '## Timeline\n' + this.data.setup.timeline + '\n\n';
    }
    
    content += '## Contact Information\n';
    content += 'SAIF Zone Business Setup Department\n';
    content += 'Website: https://www.saif-zone.com\n';
    content += 'Email: info@saif-zone.com\n';
    content += 'Phone: +971-6-557-8000\n\n';
    
    content += 'Document ID: SAIF-BS-001\n';
    content += `Version: 1.0\n`;
    content += `Date: ${new Date().toISOString().split('T')[0]}\n`;
    
    return content;
  }
  
  /**
   * Format company formation data as readable text
   */
  formatCompanyFormation() {
    let content = '# SAIF Zone Company Formation Process\n\n';
    
    if (this.data.companyFormation.process && this.data.companyFormation.process.length > 0) {
      content += '## Formation Process\n';
      this.data.companyFormation.process.forEach(step => {
        if (typeof step === 'object') {
          const title = step.title || `Step ${step.step}`;
          content += `### ${title}\n${step.description || ''}\n\n`;
        } else {
          content += `- ${step}\n`;
        }
      });
      content += '\n';
    }
    
    if (this.data.companyFormation.requirements && this.data.companyFormation.requirements.length > 0) {
      content += '## Requirements\n';
      this.data.companyFormation.requirements.forEach(req => {
        content += `- ${req}\n`;
      });
      content += '\n';
    }
    
    if (this.data.companyFormation.documents && this.data.companyFormation.documents.length > 0) {
      content += '## Required Documents\n';
      this.data.companyFormation.documents.forEach(doc => {
        content += `- ${doc}\n`;
      });
      content += '\n';
    }
    
    content += '## Contact Information\n';
    content += 'SAIF Zone Company Formation Department\n';
    content += 'Website: https://www.saif-zone.com/en/business-set-up/company-formation/\n';
    content += 'Email: info@saif-zone.com\n';
    content += 'Phone: +971-6-557-8000\n\n';
    
    content += 'Document ID: SAIF-CF-001\n';
    content += `Version: 1.0\n`;
    content += `Date: ${new Date().toISOString().split('T')[0]}\n`;
    
    return content;
  }
  
  /**
   * Format license types data as readable text
   */
  formatLicenseTypes() {
    let content = '# SAIF Zone License Types\n\n';
    
    if (this.data.licensing.types && this.data.licensing.types.length > 0) {
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
        
        const requirements = this.data.licensing.requirements[type.name];
        if (requirements && requirements.length > 0) {
          content += '### Requirements\n';
          requirements.forEach(req => {
            content += `- ${req}\n`;
          });
          content += '\n';
        }
      });
    }
    
    if (this.data.licensing.activities && this.data.licensing.activities.length > 0) {
      content += '## General Business Activities\n';
      this.data.licensing.activities.forEach(activity => {
        content += `- ${activity}\n`;
      });
      content += '\n';
    }
    
    const generalRequirements = this.data.licensing.requirements['General'];
    if (generalRequirements && generalRequirements.length > 0) {
      content += '## General Licensing Requirements\n';
      generalRequirements.forEach(req => {
        content += `- ${req}\n`;
      });
      content += '\n';
    }
    
    content += '## Contact Information\n';
    content += 'SAIF Zone Licensing Department\n';
    content += 'Website: https://www.saif-zone.com/en/business-set-up/licensing/\n';
    content += 'Email: licensing@saif-zone.com\n';
    content += 'Phone: +971-6-557-8000\n\n';
    
    content += 'Document ID: SAIF-LT-001\n';
    content += `Version: 1.0\n`;
    content += `Date: ${new Date().toISOString().split('T')[0]}\n`;
    
    return content;
  }
  
  /**
   * Format legal structures data as readable text
   */
  formatLegalStructures() {
    let content = '# SAIF Zone Legal Structures\n\n';
    
    if (this.data.legalStructure.types && this.data.legalStructure.types.length > 0) {
      this.data.legalStructure.types.forEach(type => {
        content += `## ${type.name}\n`;
        
        if (type.description) {
          content += `${type.description}\n\n`;
        }
        
        const requirements = this.data.legalStructure.requirements[type.name];
        if (requirements && requirements.length > 0) {
          content += '### Requirements\n';
          requirements.forEach(req => {
            content += `- ${req}\n`;
          });
          content += '\n';
        }
      });
    }
    
    content += '## Contact Information\n';
    content += 'SAIF Zone Legal Department\n';
    content += 'Website: https://www.saif-zone.com/en/business-set-up/legal-structure/\n';
    content += 'Email: legal@saif-zone.com\n';
    content += 'Phone: +971-6-557-8000\n\n';
    
    content += 'Document ID: SAIF-LS-001\n';
    content += `Version: 1.0\n`;
    content += `Date: ${new Date().toISOString().split('T')[0]}\n`;
    
    return content;
  }
  
  /**
   * Format package options data as readable text
   */
  formatPackageOptions() {
    let content = '# SAIF Zone Package Options\n\n';
    
    if (this.data.packageOptions.packages && this.data.packageOptions.packages.length > 0) {
      content += '## Available Packages\n\n';
      
      this.data.packageOptions.packages.forEach(pkg => {
        content += `### ${pkg.name}\n`;
        
        if (pkg.price) {
          content += `**Price:** ${pkg.price}\n\n`;
        }
        
        if (pkg.features && pkg.features.length > 0) {
          content += '**Features:**\n';
          pkg.features.forEach(feature => {
            content += `- ${feature}\n`;
          });
          content += '\n';
        }
      });
    }
    
    if (this.data.packageOptions.comparison && Object.keys(this.data.packageOptions.comparison).length > 0) {
      content += '## Package Comparison\n\n';
      
      // Convert the comparison object to a table-like format
      const features = Object.keys(this.data.packageOptions.comparison);
      const packages = Object.keys(this.data.packageOptions.comparison[features[0]] || {});
      
      if (packages.length > 0) {
        content += '| Feature | ' + packages.join(' | ') + ' |\n';
        content += '|---------|' + packages.map(() => '----------').join('|') + '|\n';
        
        features.forEach(feature => {
          content += `| ${feature} | `;
          packages.forEach(pkg => {
            content += `${this.data.packageOptions.comparison[feature][pkg] || '-'} | `;
          });
          content += '\n';
        });
        content += '\n';
      }
    }
    
    content += '## Contact Information\n';
    content += 'SAIF Zone Sales Department\n';
    content += 'Website: https://www.saif-zone.com/en/business-set-up/package-options/\n';
    content += 'Email: sales@saif-zone.com\n';
    content += 'Phone: +971-6-557-8000\n\n';
    
    content += 'Document ID: SAIF-PO-001\n';
    content += `Version: 1.0\n`;
    content += `Date: ${new Date().toISOString().split('T')[0]}\n`;
    
    return content;
  }

  /**
   * Find the SAIF Zone ID in the database
   */
  async findFreeZoneId() {
    try {
      const { db } = await import('../server/db.js');
      const { freeZones } = await import('../shared/schema.js');
      const { eq, or, like } = await import('drizzle-orm');
      
      // Find the SAIF Zone entry
      const saifZone = await db.select({ id: freeZones.id })
        .from(freeZones)
        .where(or(
          like(freeZones.name, '%SAIF%'),
          like(freeZones.name, '%Sharjah Airport%')
        ))
        .limit(1);
      
      return saifZone.length > 0 ? saifZone[0].id : null;
    } catch (error) {
      console.error(`Error finding SAIF Zone ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Update free zone in the database
   */
  async updateFreeZone(freeZoneId, data) {
    try {
      const { db } = await import('../server/db.js');
      const { freeZones } = await import('../shared/schema.js');
      const { eq } = await import('drizzle-orm');
      
      // Extract license types from our data
      const licenseTypes = data.licensing.types.map(type => ({
        name: type.name,
        description: type.description,
        activities: type.activities
      }));
      
      // Extract requirements from our data
      const requirements = [
        ...data.setup.requirements,
        ...data.companyFormation.requirements,
        ...(data.licensing.requirements.General || [])
      ];
      
      // Prepare data for database update
      const updateData = {
        website: 'https://www.saif-zone.com',
        description: data.setup.overview || '',
        requirements: JSON.stringify(requirements),
        licenseTypes: JSON.stringify(licenseTypes),
        lastUpdated: new Date().toISOString()
      };
      
      // Update the free zone record
      await db.update(freeZones)
        .set(updateData)
        .where(eq(freeZones.id, freeZoneId));
      
      console.log(`Successfully updated SAIF Zone business setup data (ID: ${freeZoneId}) in database`);
      return true;
    } catch (error) {
      console.error(`Error updating free zone in database: ${error.message}`);
      return false;
    }
  }

  /**
   * Create or update establishment guide
   */
  async createOrUpdateEstablishmentGuide(data) {
    try {
      const { db } = await import('../server/db.ts');
      const { establishmentGuides } = await import('../shared/schema.js');
      const { eq, and, like } = await import('drizzle-orm');
      
      // Check if a SAIF Zone establishment guide already exists
      const existingGuide = await db.select({ id: establishmentGuides.id })
        .from(establishmentGuides)
        .where(
          and(
            eq(establishmentGuides.category, 'free_zone'),
            like(establishmentGuides.title, '%SAIF Zone%')
          )
        )
        .limit(1);
      
      // Format comprehensive content
      const content = this.formatEstablishmentGuideContent(data);
      
      // Format steps as a structured JSON object
      const steps = {
        overview: "The SAIF Zone company setup process involves several key stages:",
        steps: data.setup.steps.map((step, index) => ({
          step: index + 1,
          title: typeof step === 'object' ? (step.title || `Step ${index + 1}`) : `Step ${index + 1}`,
          description: typeof step === 'object' ? step.description : step
        }))
      };
      
      // Format requirements as a JSON array
      const requirements = [
        ...data.setup.requirements,
        ...data.companyFormation.requirements
      ];
      
      // Format documents as a JSON array
      const documents = [
        ...data.setup.documents,
        ...data.companyFormation.documents
      ];
      
      if (existingGuide.length > 0) {
        // Update existing guide
        await db.update(establishmentGuides)
          .set({
            content,
            requirements: JSON.stringify(requirements),
            documents: JSON.stringify(documents),
            steps: JSON.stringify(steps),
            lastUpdated: new Date().toISOString()
          })
          .where(eq(establishmentGuides.id, existingGuide[0].id));
        
        console.log(`Updated SAIF Zone establishment guide (ID: ${existingGuide[0].id})`);
      } else {
        // Create new guide
        const result = await db.insert(establishmentGuides)
          .values({
            category: 'free_zone',
            title: 'SAIF Zone Business Setup Guide',
            content,
            requirements: JSON.stringify(requirements),
            documents: JSON.stringify(documents),
            steps: JSON.stringify(steps),
            lastUpdated: new Date().toISOString()
          })
          .returning({ id: establishmentGuides.id });
        
        console.log(`Created new SAIF Zone establishment guide (ID: ${result[0].id})`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error creating/updating establishment guide: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Format establishment guide content
   */
  formatEstablishmentGuideContent(data) {
    let content = '# SAIF Zone (Sharjah Airport International Free Zone) Business Setup Guide\n\n';
    
    // Introduction
    content += '## Introduction\n';
    content += data.setup.overview ? data.setup.overview : 'SAIF Zone offers a strategic location in Sharjah with excellent connectivity to major highways and ports, making it an ideal choice for businesses looking to establish in the UAE.\n\n';
    
    // Setup Process
    content += '## Business Setup Process\n';
    if (data.setup.steps && data.setup.steps.length > 0) {
      data.setup.steps.forEach((step, index) => {
        if (typeof step === 'object') {
          content += `### ${step.title || `Step ${index + 1}`}\n${step.description || ''}\n\n`;
        } else {
          content += `### Step ${index + 1}\n${step}\n\n`;
        }
      });
    } else {
      content += 'The SAIF Zone business setup process is straightforward and designed to help entrepreneurs establish their business quickly.\n\n';
    }
    
    // License Types
    content += '## License Types\n';
    if (data.licensing.types && data.licensing.types.length > 0) {
      data.licensing.types.forEach(type => {
        content += `### ${type.name}\n${type.description || ''}\n\n`;
        
        if (type.activities && type.activities.length > 0) {
          content += '**Permitted Activities:**\n';
          type.activities.forEach(activity => {
            content += `- ${activity}\n`;
          });
          content += '\n';
        }
      });
    } else {
      content += 'SAIF Zone offers various license types including Commercial, Service, and Industrial licenses to accommodate different business activities.\n\n';
    }
    
    // Legal Structures
    content += '## Legal Structures\n';
    if (data.legalStructure.types && data.legalStructure.types.length > 0) {
      data.legalStructure.types.forEach(type => {
        content += `### ${type.name}\n${type.description || ''}\n\n`;
      });
    } else {
      content += 'Businesses in SAIF Zone can be established as Free Zone Establishments (FZE), Free Zone Companies (FZC), or branches of existing companies.\n\n';
    }
    
    // Requirements
    content += '## Requirements\n';
    if (data.setup.requirements && data.setup.requirements.length > 0) {
      data.setup.requirements.forEach(req => {
        content += `- ${req}\n`;
      });
    } else if (data.companyFormation.requirements && data.companyFormation.requirements.length > 0) {
      data.companyFormation.requirements.forEach(req => {
        content += `- ${req}\n`;
      });
    } else {
      content += 'Requirements typically include application forms, passport copies, business plans, and proof of capital requirements depending on the selected business activity.\n';
    }
    content += '\n';
    
    // Documents
    content += '## Required Documents\n';
    if (data.setup.documents && data.setup.documents.length > 0) {
      data.setup.documents.forEach(doc => {
        content += `- ${doc}\n`;
      });
    } else if (data.companyFormation.documents && data.companyFormation.documents.length > 0) {
      data.companyFormation.documents.forEach(doc => {
        content += `- ${doc}\n`;
      });
    } else {
      content += 'Required documents typically include passport copies, photos, CV/resume, bank reference letters, and business plans.\n';
    }
    content += '\n';
    
    // Package Options
    content += '## Package Options\n';
    if (data.packageOptions.packages && data.packageOptions.packages.length > 0) {
      data.packageOptions.packages.forEach(pkg => {
        content += `### ${pkg.name}\n`;
        if (pkg.price) content += `**Price:** ${pkg.price}\n\n`;
        
        if (pkg.features && pkg.features.length > 0) {
          content += '**Features:**\n';
          pkg.features.forEach(feature => {
            content += `- ${feature}\n`;
          });
          content += '\n';
        }
      });
    } else {
      content += 'SAIF Zone offers various packages to suit different business needs and budgets, including options for office space, warehousing, and virtual offices.\n\n';
    }
    
    // Timeline and Fees
    content += '## Timeline and Fees\n';
    if (data.setup.timeline) {
      content += data.setup.timeline + '\n\n';
    } else {
      content += 'The company registration process in SAIF Zone typically takes 7-10 working days from the submission of all required documents. Fees vary based on the license type, facility requirements, and selected package.\n\n';
    }
    
    // Contact Information
    content += '## Contact Information\n';
    content += 'SAIF Zone Registration Department\n';
    content += 'Website: https://www.saif-zone.com\n';
    content += 'Email: info@saif-zone.com\n';
    content += 'Phone: +971-6-557-8000\n\n';
    
    content += 'Document ID: SAIF-BSG-001\n';
    content += `Version: 1.0\n`;
    content += `Last Updated: ${new Date().toISOString().split('T')[0]}\n`;
    
    return content;
  }
}

/**
 * Run the SAIF Zone business setup scraper
 * @param {Object} options Scraper options
 * @returns {Promise<Object>} Result of the scraping process
 */
export async function scrapeSAIFZoneBusinessSetup(options = {}) {
  const scraper = new SAIFZoneBusinessSetupScraper(options);
  return await scraper.scrape();
}

export {
  SAIFZoneBusinessSetupScraper
};