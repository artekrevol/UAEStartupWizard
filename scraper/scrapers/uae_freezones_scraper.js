/**
 * Scraper implementation for UAE Free Zones website
 */
import { BaseScraper } from '../utils/scraper_base.js';

class UAEFreeZonesScraper extends BaseScraper {
  constructor(options = {}) {
    // Pass options to parent class
    super({
      ...options,
      // Default options for this specific scraper
      baseUrl: 'https://uaefreezones.com',
      delayBetweenRequests: 1500, // Be more conservative with delays
    });
    
    // Specific properties for this scraper
    this.freeZonesUrl = `${this.baseUrl}/free-zones-in-dubai-uae`;
  }

  /**
   * Main method to run the scraper
   */
  async scrape() {
    try {
      console.log('Starting UAE Free Zones scraper...');
      
      // Get all free zone links from the homepage
      const freeZoneLinks = await this.getFreeZoneLinks();
      
      if (!freeZoneLinks || freeZoneLinks.length === 0) {
        console.error('No free zone links found');
        return false;
      }
      
      console.log(`Found ${freeZoneLinks.length} free zone links`);
      
      // Scrape each free zone page
      for (const [index, link] of freeZoneLinks.entries()) {
        console.log(`Scraping free zone ${index + 1}/${freeZoneLinks.length}: ${link}`);
        
        const freeZoneData = await this.scrapeFreeZonePage(link);
        
        if (freeZoneData) {
          // Store the free zone data
          await this.upsertFreeZone(freeZoneData);
        }
        
        // Add delay between requests to avoid rate limiting
        await this.sleep(this.delayBetweenRequests);
      }
      
      console.log('UAE Free Zones scraping completed successfully');
      return true;
    } catch (error) {
      console.error('Error in UAE Free Zones scraper:', error);
      return false;
    } finally {
      // Clean up resources
      await this.cleanup();
    }
  }

  /**
   * Gets all free zone links from the homepage
   */
  async getFreeZoneLinks() {
    try {
      const html = await this.fetchUrl(this.freeZonesUrl);
      
      if (!html) {
        console.error('Failed to fetch free zones page');
        return [];
      }
      
      const $ = this.parseHtml(html);
      
      if (!$) {
        console.error('Failed to parse HTML');
        return [];
      }
      
      // Extract free zone links
      const links = [];
      $('.free-zone-item a').each((i, el) => {
        const href = $(el).attr('href');
        
        if (href) {
          // Construct absolute URL if relative
          const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
          links.push(fullUrl);
        }
      });
      
      return links;
    } catch (error) {
      console.error('Error getting free zone links:', error);
      return [];
    }
  }

  /**
   * Scrapes an individual free zone page
   */
  async scrapeFreeZonePage(url) {
    try {
      const html = await this.fetchUrl(url);
      
      if (!html) {
        console.error(`Failed to fetch free zone page: ${url}`);
        return null;
      }
      
      const $ = this.parseHtml(html);
      
      if (!$) {
        console.error(`Failed to parse HTML for: ${url}`);
        return null;
      }
      
      // Extract free zone name
      const name = this.extractText($, '.free-zone-title');
      
      if (!name) {
        console.error(`Failed to extract free zone name from: ${url}`);
        return null;
      }
      
      // Extract description
      const description = this.extractText($, '.free-zone-description');
      
      // Extract location
      const location = this.extractText($, '.location-info');
      
      // Extract benefits
      const benefits = [];
      $('.benefits-list li').each((i, el) => {
        const benefit = this.extractText($, el);
        if (benefit) {
          benefits.push(benefit);
        }
      });
      
      // Extract industries
      const industries = [];
      $('.industries-list li').each((i, el) => {
        const industry = this.extractText($, el);
        if (industry) {
          industries.push(industry);
        }
      });
      
      // Extract license types
      const licenseTypes = [];
      $('.license-types-list li').each((i, el) => {
        const licenseType = this.extractText($, el);
        if (licenseType) {
          licenseTypes.push(licenseType);
        }
      });
      
      // Extract website
      const website = $('.official-website a').attr('href');
      
      // Extract setup costs
      const setupCost = {};
      $('.setup-costs .cost-item').each((i, el) => {
        const costType = this.extractText($, el, '.cost-type');
        const costValue = this.extractText($, el, '.cost-value');
        
        if (costType && costValue) {
          setupCost[costType] = costValue;
        }
      });
      
      // Compile free zone data
      return {
        name,
        description,
        location,
        benefits,
        industries,
        licenseTypes,
        website,
        setupCost,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error scraping free zone page ${url}:`, error);
      return null;
    }
  }

  /**
   * Upsert free zone data to the database
   */
  async upsertFreeZone(data) {
    try {
      // Convert free zone to database format
      const freeZoneRecord = {
        name: data.name,
        description: data.description || null,
        location: data.location || null,
        benefits: JSON.stringify(data.benefits || []),
        industries: JSON.stringify(data.industries || []),
        licenseTypes: JSON.stringify(data.licenseTypes || []),
        website: data.website || null,
        setupCost: JSON.stringify(data.setupCost || {}),
        lastUpdated: data.lastUpdated
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
      console.error(`Error upserting free zone ${data.name}:`, error);
      throw error;
    }
  }
}

/**
 * Function to run the UAE Free Zones scraper
 */
async function scrapeUAEFreeZones(options = {}) {
  const scraper = new UAEFreeZonesScraper(options);
  const result = await scraper.scrape();
  return result;
}

export { UAEFreeZonesScraper, scrapeUAEFreeZones };