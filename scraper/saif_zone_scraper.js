/**
 * SAIF Zone (Sharjah Airport International Free Zone) Specialized Scraper
 * 
 * This scraper extracts comprehensive information from the SAIF Zone website,
 * including overview, business activities, facilities, setup process, fees,
 * and FAQs.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const { PlaywrightScraper } = require('./utils/playwright_scraper_base');

class SAIFZoneScraper extends PlaywrightScraper {
  constructor(options = {}) {
    super({
      name: 'saif_zone_scraper',
      baseUrl: 'https://www.saif-zone.com',
      ...options
    });

    // Define URLs for different sections
    this.urls = {
      overview: 'https://www.saif-zone.com/en/about-us',
      businessActivities: 'https://www.saif-zone.com/en/business-activities',
      facilities: 'https://www.saif-zone.com/en/facilities',
      setup: 'https://www.saif-zone.com/en/setup',
      costs: 'https://www.saif-zone.com/en/costs',
      faqs: 'https://www.saif-zone.com/en/faqs'
    };

    // Initialize data structure
    this.data = {
      name: 'Sharjah Airport International Free Zone (SAIF Zone)',
      website: 'https://www.saif-zone.com',
      overview: {},
      businessActivities: [],
      facilities: {},
      setup: {},
      costs: {},
      faqs: []
    };

    // Create directory for SAIF Zone data
    this.dataDir = path.join(process.cwd(), 'saif_zone_docs');
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
      this.logger.info('Starting SAIF Zone scraper');
      
      await this.initializeBrowser();
      
      // Extract all sections
      this.logger.info('Extracting SAIF Zone data...');
      await this.extractAllData();
      
      // Save extracted data to JSON file for reference
      this.saveDataToFile();
      
      // Check if we found a free zone ID in the database
      const freeZoneId = await this.findFreeZoneId();
      
      if (freeZoneId) {
        // Update the free zone record with the data we extracted
        await this.updateFreeZone(freeZoneId, this.data);
        this.logger.info(`Successfully updated SAIF Zone (ID: ${freeZoneId}) in database`);
      } else {
        this.logger.error('Could not find SAIF Zone in database. Please ensure it exists first.');
      }
      
      this.scrapingCompleted = true;
      this.logger.info('SAIF Zone scraping completed successfully');
      
      return {
        success: true,
        data: this.data
      };
    } catch (error) {
      this.logger.error(`Error scraping SAIF Zone: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Extract all required data from SAIF Zone website
   */
  async extractAllData() {
    // Extract overview information
    this.logger.info('Extracting overview');
    await this.extractOverview();
    
    // Extract business activities
    this.logger.info('Extracting business activities');
    await this.extractBusinessActivities();
    
    // Extract facilities information
    this.logger.info('Extracting facilities');
    await this.extractFacilities();
    
    // Extract setup process
    this.logger.info('Extracting setup process');
    await this.extractSetupProcess();
    
    // Extract costs and fees
    this.logger.info('Extracting costs');
    await this.extractCosts();
    
    // Extract FAQs
    this.logger.info('Extracting FAQs');
    await this.extractFAQs();
  }

  /**
   * Extract general overview information
   */
  async extractOverview() {
    try {
      await this.page.goto(this.urls.overview, { waitUntil: 'networkidle' });
      
      // Extract main content
      const content = await this.page.evaluate(() => {
        const mainContent = document.querySelector('.main-content');
        return mainContent ? mainContent.innerText : '';
      });
      
      // Extract intro paragraphs
      const description = await this.page.evaluate(() => {
        const introParagraphs = Array.from(document.querySelectorAll('.main-content p'));
        return introParagraphs.map(p => p.innerText).join('\n\n');
      });
      
      // Extract key highlights/benefits
      const benefits = await this.page.evaluate(() => {
        const benefitItems = Array.from(document.querySelectorAll('.benefits-list li, .highlights-list li, .advantages-list li'));
        return benefitItems.map(item => item.innerText.trim());
      });
      
      this.data.overview = {
        content,
        description,
        benefits
      };
      
      this.logger.info('Overview extracted successfully');
    } catch (error) {
      this.logger.error(`Error extracting overview: ${error.message}`);
    }
  }

  /**
   * Extract business activities/industries
   */
  async extractBusinessActivities() {
    try {
      await this.page.goto(this.urls.businessActivities, { waitUntil: 'networkidle' });
      
      // Extract activities list
      const activities = await this.page.evaluate(() => {
        const activityItems = Array.from(document.querySelectorAll('.activities-list li, .business-activities li, .permitted-activities li'));
        if (activityItems.length > 0) {
          return activityItems.map(item => item.innerText.trim());
        }
        
        // If no specific list, try to extract from paragraphs
        const contentParagraphs = Array.from(document.querySelectorAll('.main-content p'));
        return contentParagraphs.map(p => p.innerText.trim());
      });
      
      // Extract categories if available
      const categories = await this.page.evaluate(() => {
        const categoryHeadings = Array.from(document.querySelectorAll('.activity-category h3, .category-heading'));
        const result = [];
        
        categoryHeadings.forEach(heading => {
          const categoryName = heading.innerText.trim();
          const categoryItems = [];
          
          let el = heading.nextElementSibling;
          while (el && !el.matches('h3, .category-heading')) {
            if (el.tagName === 'LI' || el.tagName === 'P') {
              categoryItems.push(el.innerText.trim());
            } else if (el.querySelectorAll('li').length > 0) {
              Array.from(el.querySelectorAll('li')).forEach(li => {
                categoryItems.push(li.innerText.trim());
              });
            }
            el = el.nextElementSibling;
          }
          
          if (categoryItems.length > 0) {
            result.push({
              name: categoryName,
              activities: categoryItems
            });
          }
        });
        
        return result;
      });
      
      this.data.businessActivities = categories.length > 0 ? categories : activities;
      this.logger.info('Business activities extracted successfully');
    } catch (error) {
      this.logger.error(`Error extracting business activities: ${error.message}`);
    }
  }

  /**
   * Extract facilities information
   */
  async extractFacilities() {
    try {
      await this.page.goto(this.urls.facilities, { waitUntil: 'networkidle' });
      
      // Extract facility types
      const facilities = await this.page.evaluate(() => {
        // Look for facility sections
        const facilityTypes = {};
        
        // Common section types
        const sectionTypes = [
          { name: 'Warehouses', selectors: ['.warehouses', '#warehouses', '[data-facility="warehouse"]'] },
          { name: 'Offices', selectors: ['.offices', '#offices', '[data-facility="office"]'] },
          { name: 'Land', selectors: ['.land', '#land', '[data-facility="land"]'] },
          { name: 'Executive Offices', selectors: ['.executive-offices', '#executive-offices'] }
        ];
        
        // Try to extract content for each section type
        sectionTypes.forEach(type => {
          for (const selector of type.selectors) {
            const section = document.querySelector(selector);
            if (section) {
              const content = section.innerText.trim();
              if (content) {
                facilityTypes[type.name] = content;
                break;
              }
            }
          }
        });
        
        // If no structured content found, extract all content
        if (Object.keys(facilityTypes).length === 0) {
          const mainContent = document.querySelector('.main-content');
          if (mainContent) {
            facilityTypes['General'] = mainContent.innerText.trim();
          }
        }
        
        return facilityTypes;
      });
      
      // Extract facility images if available
      const facilityImages = await this.page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('.facility-image, .facilities img'));
        return images.map(img => ({
          src: img.src,
          alt: img.alt || 'SAIF Zone Facility'
        }));
      });
      
      this.data.facilities = {
        types: facilities,
        images: facilityImages
      };
      
      this.logger.info('Facilities extracted successfully');
    } catch (error) {
      this.logger.error(`Error extracting facilities: ${error.message}`);
    }
  }

  /**
   * Extract setup process information
   */
  async extractSetupProcess() {
    try {
      await this.page.goto(this.urls.setup, { waitUntil: 'networkidle' });
      
      // Extract setup steps
      const setupSteps = await this.page.evaluate(() => {
        // Look for numbered steps or lists
        const stepElements = Array.from(document.querySelectorAll('.setup-steps li, .steps li, .process-steps li, ol li'));
        
        if (stepElements.length > 0) {
          return stepElements.map((step, index) => ({
            step: index + 1,
            description: step.innerText.trim()
          }));
        }
        
        // If no specific steps found, extract general content
        return {
          generalProcess: document.querySelector('.main-content') ? 
            document.querySelector('.main-content').innerText.trim() : 
            'No setup process information found'
        };
      });
      
      // Extract requirements if available
      const requirements = await this.page.evaluate(() => {
        const reqElements = Array.from(document.querySelectorAll('.requirements li, .documents-required li'));
        return reqElements.map(req => req.innerText.trim());
      });
      
      this.data.setup = {
        steps: setupSteps,
        requirements
      };
      
      this.logger.info('Setup process extracted successfully');
    } catch (error) {
      this.logger.error(`Error extracting setup process: ${error.message}`);
    }
  }

  /**
   * Extract costs and fees
   */
  async extractCosts() {
    try {
      await this.page.goto(this.urls.costs, { waitUntil: 'networkidle' });
      
      // Extract fee tables or lists
      const feesData = await this.page.evaluate(() => {
        // Look for tables
        const tables = Array.from(document.querySelectorAll('table'));
        const extractedTables = [];
        
        if (tables.length > 0) {
          tables.forEach(table => {
            const tableData = {
              title: table.caption ? table.caption.innerText.trim() : 'Fee Table',
              headers: [],
              rows: []
            };
            
            // Extract headers
            const headerCells = Array.from(table.querySelectorAll('th'));
            if (headerCells.length > 0) {
              tableData.headers = headerCells.map(th => th.innerText.trim());
            }
            
            // Extract rows
            const rows = Array.from(table.querySelectorAll('tr:not(:first-child)'));
            rows.forEach(row => {
              const cells = Array.from(row.querySelectorAll('td'));
              if (cells.length > 0) {
                tableData.rows.push(cells.map(td => td.innerText.trim()));
              }
            });
            
            extractedTables.push(tableData);
          });
          
          return { tables: extractedTables };
        }
        
        // If no tables, look for fee lists
        const feeItems = Array.from(document.querySelectorAll('.fee-item, .cost-item, .price-list li'));
        if (feeItems.length > 0) {
          return {
            feeList: feeItems.map(item => item.innerText.trim())
          };
        }
        
        // If no structured content, extract general content
        return {
          generalInfo: document.querySelector('.main-content') ? 
            document.querySelector('.main-content').innerText.trim() : 
            'No cost information found'
        };
      });
      
      this.data.costs = feesData;
      this.logger.info('Costs extracted successfully');
    } catch (error) {
      this.logger.error(`Error extracting costs: ${error.message}`);
    }
  }

  /**
   * Extract FAQs
   */
  async extractFAQs() {
    try {
      await this.page.goto(this.urls.faqs, { waitUntil: 'networkidle' });
      
      // Extract FAQ items
      const faqs = await this.page.evaluate(() => {
        // Look for FAQ question-answer pairs
        const faqItems = [];
        
        // Method 1: Look for common FAQ structures with questions and answers
        const questionElements = Array.from(document.querySelectorAll('.faq-question, .question, .accordion-header, dt'));
        
        questionElements.forEach((questionEl, index) => {
          const question = questionEl.innerText.trim();
          let answer = '';
          
          // Find associated answer based on structure
          if (questionEl.classList.contains('accordion-header')) {
            // Accordion structure
            const panel = questionEl.nextElementSibling;
            if (panel && panel.classList.contains('accordion-panel')) {
              answer = panel.innerText.trim();
            }
          } else if (questionEl.tagName === 'DT') {
            // Definition list structure
            const ddElement = questionEl.nextElementSibling;
            if (ddElement && ddElement.tagName === 'DD') {
              answer = ddElement.innerText.trim();
            }
          } else {
            // Generic question-answer structure
            const answerEl = document.querySelector(`.faq-answer:nth-child(${index + 1}), .answer:nth-child(${index + 1})`);
            if (answerEl) {
              answer = answerEl.innerText.trim();
            }
          }
          
          if (question && answer) {
            faqItems.push({ question, answer });
          }
        });
        
        // If no structured FAQ found, try to extract from general content
        if (faqItems.length === 0) {
          const contentParagraphs = Array.from(document.querySelectorAll('.main-content p'));
          for (let i = 0; i < contentParagraphs.length; i += 2) {
            if (i + 1 < contentParagraphs.length) {
              const question = contentParagraphs[i].innerText.trim();
              const answer = contentParagraphs[i + 1].innerText.trim();
              
              if (question && answer && (question.endsWith('?') || question.length < 100)) {
                faqItems.push({ question, answer });
              }
            }
          }
        }
        
        return faqItems;
      });
      
      this.data.faqs = faqs;
      this.logger.info(`Extracted ${faqs.length} FAQs successfully`);
    } catch (error) {
      this.logger.error(`Error extracting FAQs: ${error.message}`);
    }
  }

  /**
   * Save extracted data to a JSON file
   */
  saveDataToFile() {
    try {
      const filePath = path.join(this.dataDir, 'saif_zone_data.json');
      fs.writeFileSync(filePath, JSON.stringify(this.data, null, 2));
      this.logger.info(`Saved SAIF Zone data to ${filePath}`);
    } catch (error) {
      this.logger.error(`Error saving data to file: ${error.message}`);
    }
  }

  /**
   * Find the SAIF Zone ID in the database
   */
  async findFreeZoneId() {
    try {
      const { db } = require('../server/db');
      const { freeZones } = require('../shared/schema');
      const { eq } = require('drizzle-orm');
      
      // Try to find by exact name
      let freeZone = await db.select().from(freeZones)
        .where(eq(freeZones.name, 'Sharjah Airport International Free Zone (SAIF Zone)'))
        .limit(1);
      
      // If not found, try with partial name match
      if (!freeZone.length) {
        freeZone = await db.select().from(freeZones)
          .where(eq(freeZones.name, 'SAIF Zone'))
          .limit(1);
      }
      
      // Another attempt with more generic name
      if (!freeZone.length) {
        freeZone = await db.select().from(freeZones)
          .where(eq(freeZones.name, 'Sharjah Airport Free Zone'))
          .limit(1);
      }
      
      return freeZone.length ? freeZone[0].id : null;
    } catch (error) {
      this.logger.error(`Error finding free zone ID: ${error.message}`);
      return null;
    }
  }

  /**
   * Update free zone in the database
   */
  async updateFreeZone(freeZoneId, data) {
    try {
      const { db } = require('../server/db');
      const { freeZones } = require('../shared/schema');
      const { eq } = require('drizzle-orm');
      
      // Prepare data for database update
      const updateData = {
        website: data.website,
        description: data.overview.description || '',
        benefits: data.overview.benefits || [],
        businessActivities: Array.isArray(data.businessActivities) ? 
          data.businessActivities : 
          [data.businessActivities],
        facilities: data.facilities.types || {},
        requirements: data.setup.requirements || [],
        setupProcess: data.setup.steps || {},
        costs: data.costs || {},
        faq: data.faqs || []
      };
      
      // Update the free zone record
      await db.update(freeZones)
        .set({
          website: updateData.website,
          description: updateData.description,
          benefits: JSON.stringify(updateData.benefits),
          businessActivities: JSON.stringify(updateData.businessActivities),
          facilities: JSON.stringify(updateData.facilities),
          requirements: JSON.stringify(updateData.requirements),
          setupProcess: JSON.stringify(updateData.setupProcess),
          costs: JSON.stringify(updateData.costs),
          faq: JSON.stringify(updateData.faq),
          lastUpdated: new Date().toISOString()
        })
        .where(eq(freeZones.id, freeZoneId));
      
      this.logger.info(`Successfully updated SAIF Zone (ID: ${freeZoneId}) in database`);
      return true;
    } catch (error) {
      this.logger.error(`Error updating free zone in database: ${error.message}`);
      return false;
    }
  }
}

/**
 * Run the SAIF Zone scraper
 */
async function runSAIFZoneScraper(options = {}) {
  const scraper = new SAIFZoneScraper(options);
  return await scraper.scrape();
}

module.exports = {
  SAIFZoneScraper,
  runSAIFZoneScraper
};