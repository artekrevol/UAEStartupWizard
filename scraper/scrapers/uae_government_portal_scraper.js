/**
 * Scraper implementation for UAE Government Portal
 * Demonstrates how to use the PlaywrightScraper base class for a specific website
 */
import { PlaywrightScraper } from '../utils/playwright_scraper_base.js';
import fs from 'fs';
import path from 'path';

class UAEGovernmentPortalScraper extends PlaywrightScraper {
  constructor(options = {}) {
    // Pass options to parent class
    super({
      ...options,
      // Default options for this specific scraper
      baseUrl: 'https://u.ae/en',
      retries: 5,
      timeout: 60000,
      headless: process.env.NODE_ENV === 'production', // Headless in production, with UI in development
      screenshots: process.env.NODE_ENV !== 'production', // Take screenshots in development
      screenshotPath: './screenshots/uae_government_portal',
    });

    // Create screenshots directory if it doesn't exist
    if (this.screenshots && !fs.existsSync(this.screenshotPath)) {
      fs.mkdirSync(this.screenshotPath, { recursive: true });
    }

    // Specific properties for this scraper
    this.businessServicesBaseUrl = `${this.baseUrl}/business/setting-up-business`;
    this.licenseTypesUrl = `${this.businessServicesBaseUrl}/types-of-business-licences`;
    this.freeZonesUrl = `${this.businessServicesBaseUrl}/free-zones`;
    
    // Storage for scraped data
    this.businessLicenses = [];
    this.freeZones = [];
  }

  /**
   * Main method to run the scraper
   */
  async scrape() {
    try {
      console.log('Starting UAE Government Portal scraper...');
      
      // Initialize Playwright
      const initSuccess = await this.initialize();
      if (!initSuccess) {
        throw new Error('Failed to initialize browser');
      }
      
      // Scrape business license types
      await this.scrapeBusinessLicenses();
      
      // Scrape free zones information
      await this.scrapeFreeZones();
      
      // Process and store the scraped data
      await this.processScrapedData();
      
      console.log('UAE Government Portal scraping completed successfully');
      return true;
    } catch (error) {
      console.error('Error in UAE Government Portal scraper:', error);
      return false;
    } finally {
      // Clean up resources
      await this.cleanup();
    }
  }

  /**
   * Scrape business license types
   */
  async scrapeBusinessLicenses() {
    console.log('Scraping business license types...');
    
    // Navigate to the license types page
    const navSuccess = await this.navigateTo(this.licenseTypesUrl);
    if (!navSuccess) {
      console.error('Failed to navigate to license types page');
      return;
    }
    
    // Wait for the content to load
    await this.page.waitForSelector('.license-types', { state: 'visible' });
    
    // Extract license types
    this.businessLicenses = await this.extractData(async (page) => {
      return page.$$eval('.license-type-item', items => {
        return items.map(item => {
          const title = item.querySelector('.license-title')?.textContent?.trim() || '';
          const description = item.querySelector('.license-description')?.textContent?.trim() || '';
          const requirements = Array.from(item.querySelectorAll('.license-requirements li'))
            .map(req => req.textContent?.trim() || '');
          
          return {
            name: title,
            description,
            requirements,
            lastUpdated: new Date().toISOString()
          };
        });
      });
    });
    
    console.log(`Found ${this.businessLicenses.length} business license types`);
  }

  /**
   * Scrape free zones information
   */
  async scrapeFreeZones() {
    console.log('Scraping free zones information...');
    
    // Navigate to the free zones page
    const navSuccess = await this.navigateTo(this.freeZonesUrl);
    if (!navSuccess) {
      console.error('Failed to navigate to free zones page');
      return;
    }
    
    // Wait for the content to load
    await this.page.waitForSelector('.free-zones-list', { state: 'visible' });
    
    // Extract free zones list
    const freeZoneLinks = await this.page.$$eval('.free-zone-item a', links => {
      return links.map(link => ({
        name: link.textContent?.trim() || '',
        url: link.getAttribute('href') || ''
      }));
    });
    
    console.log(`Found ${freeZoneLinks.length} free zone links`);
    
    // Scrape details for each free zone
    this.freeZones = [];
    
    for (const [index, freeZone] of freeZoneLinks.entries()) {
      console.log(`Scraping details for free zone ${index + 1}/${freeZoneLinks.length}: ${freeZone.name}`);
      
      // Construct the full URL if it's relative
      const freeZoneUrl = freeZone.url.startsWith('http') 
        ? freeZone.url
        : `${this.baseUrl}${freeZone.url.startsWith('/') ? '' : '/'}${freeZone.url}`;
      
      // Navigate to the free zone page
      const navSuccess = await this.navigateTo(freeZoneUrl);
      if (!navSuccess) {
        console.error(`Failed to navigate to free zone page: ${freeZoneUrl}`);
        continue;
      }
      
      // Extract free zone details
      const freeZoneDetails = await this.extractFreeZoneDetails(freeZone.name);
      
      if (freeZoneDetails) {
        this.freeZones.push(freeZoneDetails);
      }
      
      // Take a short break between requests to avoid rate limiting
      await this.sleep(1000);
    }
    
    console.log(`Successfully scraped ${this.freeZones.length} free zones`);
  }

  /**
   * Extract details for a specific free zone
   */
  async extractFreeZoneDetails(name) {
    try {
      return await this.extractData(async (page) => {
        // Basic information
        const description = await this.extractText('.free-zone-description');
        const location = await this.extractText('.location-info');
        
        // Benefits
        const benefits = await page.$$eval('.benefits-list li', items => 
          items.map(item => item.textContent?.trim() || '')
        );
        
        // Industries
        const industries = await page.$$eval('.industries-list li', items => 
          items.map(item => item.textContent?.trim() || '')
        );
        
        // License types
        const licenseTypes = await page.$$eval('.license-types-list li', items => 
          items.map(item => item.textContent?.trim() || '')
        );
        
        // Website
        const website = await this.extractAttribute('.official-website a', 'href');
        
        // Setup costs
        const setupCosts = {};
        const costItems = await page.$$('.setup-costs .cost-item');
        
        for (const costItem of costItems) {
          const costType = await costItem.$eval('.cost-type', el => el.textContent?.trim() || '');
          const costValue = await costItem.$eval('.cost-value', el => el.textContent?.trim() || '');
          
          if (costType && costValue) {
            setupCosts[costType] = costValue;
          }
        }
        
        return {
          name,
          description,
          location,
          benefits,
          industries,
          licenseTypes,
          website,
          setupCost: setupCosts,
          lastUpdated: new Date().toISOString()
        };
      });
    } catch (error) {
      console.error(`Error extracting details for free zone ${name}:`, error.message);
      return null;
    }
  }

  /**
   * Process and store the scraped data
   */
  async processScrapedData() {
    console.log('Processing and storing scraped data...');
    
    // Store business license types
    if (this.businessLicenses.length > 0) {
      for (const license of this.businessLicenses) {
        try {
          await this.upsertLicenseType(license);
        } catch (error) {
          console.error(`Error storing license type ${license.name}:`, error);
        }
      }
    }
    
    // Store free zones
    if (this.freeZones.length > 0) {
      for (const freeZone of this.freeZones) {
        try {
          await this.upsertFreeZone(freeZone);
        } catch (error) {
          console.error(`Error storing free zone ${freeZone.name}:`, error);
        }
      }
    }
    
    console.log('Data processing and storage completed');
  }

  /**
   * Insert or update a license type in the database
   */
  async upsertLicenseType(licenseData) {
    try {
      // Convert license to database format
      const licenseRecord = {
        name: licenseData.name,
        description: licenseData.description,
        requirements: JSON.stringify(licenseData.requirements || []),
        lastUpdated: licenseData.lastUpdated
      };
      
      // SQL query to upsert the license
      const query = `
        INSERT INTO license_types (name, description, requirements, last_updated)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) 
        DO UPDATE SET
          description = EXCLUDED.description,
          requirements = EXCLUDED.requirements,
          last_updated = EXCLUDED.last_updated
        RETURNING id
      `;
      
      const result = await this.executeQuery(query, [
        licenseRecord.name,
        licenseRecord.description,
        licenseRecord.requirements,
        licenseRecord.lastUpdated
      ]);
      
      if (result && result.rows && result.rows.length > 0) {
        console.log(`Upserted license type: ${licenseRecord.name} with ID ${result.rows[0].id}`);
        return result.rows[0].id;
      } else {
        console.warn(`Failed to upsert license type: ${licenseRecord.name}`);
        return null;
      }
    } catch (error) {
      console.error(`Error upserting license type ${licenseData.name}:`, error);
      throw error;
    }
  }

  /**
   * Insert or update a free zone in the database
   */
  async upsertFreeZone(freeZoneData) {
    try {
      // Convert free zone to database format
      const freeZoneRecord = {
        name: freeZoneData.name,
        description: freeZoneData.description || null,
        location: freeZoneData.location || null,
        benefits: JSON.stringify(freeZoneData.benefits || []),
        industries: JSON.stringify(freeZoneData.industries || []),
        licenseTypes: JSON.stringify(freeZoneData.licenseTypes || []),
        website: freeZoneData.website || null,
        setupCost: JSON.stringify(freeZoneData.setupCost || {}),
        lastUpdated: freeZoneData.lastUpdated
      };
      
      // SQL query to upsert the free zone
      const query = `
        INSERT INTO free_zones (name, description, location, benefits, industries, license_types, website, setup_cost, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (name) 
        DO UPDATE SET
          description = EXCLUDED.description,
          location = EXCLUDED.location,
          benefits = EXCLUDED.benefits,
          industries = EXCLUDED.industries,
          license_types = EXCLUDED.license_types,
          website = EXCLUDED.website,
          setup_cost = EXCLUDED.setup_cost,
          last_updated = EXCLUDED.last_updated
        RETURNING id
      `;
      
      const result = await this.executeQuery(query, [
        freeZoneRecord.name,
        freeZoneRecord.description,
        freeZoneRecord.location,
        freeZoneRecord.benefits,
        freeZoneRecord.industries,
        freeZoneRecord.licenseTypes,
        freeZoneRecord.website,
        freeZoneRecord.setupCost,
        freeZoneRecord.lastUpdated
      ]);
      
      if (result && result.rows && result.rows.length > 0) {
        console.log(`Upserted free zone: ${freeZoneRecord.name} with ID ${result.rows[0].id}`);
        return result.rows[0].id;
      } else {
        console.warn(`Failed to upsert free zone: ${freeZoneRecord.name}`);
        return null;
      }
    } catch (error) {
      console.error(`Error upserting free zone ${freeZoneData.name}:`, error);
      throw error;
    }
  }
}

/**
 * Function to run the UAE Government Portal scraper
 */
async function scrapeUAEGovernmentPortal(options = {}) {
  const scraper = new UAEGovernmentPortalScraper(options);
  const result = await scraper.scrape();
  return result;
}

export { UAEGovernmentPortalScraper, scrapeUAEGovernmentPortal };