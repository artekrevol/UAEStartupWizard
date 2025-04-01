// scraper/scrapers/uae_freezones_scraper.js
import { BaseScraper } from '../utils/scraper_base.js';

/**
 * Scraper implementation for UAE Free Zones website
 */
class UAEFreeZonesScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    this.baseUrl = 'https://www.uaefreezones.com';
    this.defaultSource = 'UAEFreeZones.com';
  }
  
  /**
   * Main method to run the scraper
   */
  async scrape() {
    console.log('Starting UAE Free Zones scraper...');
    
    try {
      // Get all free zone links from the homepage
      const freeZoneLinks = await this.getFreeZoneLinks();
      
      if (!freeZoneLinks || freeZoneLinks.length === 0) {
        console.error('No free zone links found on the homepage');
        return false;
      }
      
      console.log(`Found ${freeZoneLinks.length} free zone links`);
      
      // Process each free zone page
      for (const link of freeZoneLinks) {
        await this.scrapeFreeZonePage(link);
        
        // Add a small delay between requests to be respectful to the server
        await this.sleep(1000);
      }
      
      console.log('UAE Free Zones scraping completed successfully');
      return true;
    } catch (error) {
      console.error(`Error in UAE Free Zones scraper: ${error.message}`);
      return false;
    } finally {
      await this.cleanup();
    }
  }
  
  /**
   * Gets all free zone links from the homepage
   */
  async getFreeZoneLinks() {
    console.log(`Fetching homepage: ${this.baseUrl}`);
    
    const html = await this.fetchUrl(this.baseUrl);
    if (!html) return [];
    
    const $ = this.parseHtml(html);
    if (!$) return [];
    
    const links = new Set();
    
    // Find all free zone links (those containing "fz_" and ending with .html)
    $('a[href*="fz_"]').each((_, element) => {
      const href = $(element).attr('href');
      
      if (href && href.includes('fz_') && href.endsWith('.html')) {
        // Normalize the URL (handle relative and absolute URLs)
        const fullUrl = href.startsWith('http') ? href : 
                      href.startsWith('/') ? `${this.baseUrl}${href}` : 
                      `${this.baseUrl}/${href}`;
        
        links.add(fullUrl);
      }
    });
    
    return Array.from(links);
  }
  
  /**
   * Scrapes an individual free zone page
   */
  async scrapeFreeZonePage(url) {
    console.log(`Scraping free zone page: ${url}`);
    
    const html = await this.fetchUrl(url);
    if (!html) {
      console.error(`Failed to fetch ${url}`);
      return;
    }
    
    const $ = this.parseHtml(html);
    if (!$) {
      console.error(`Failed to parse HTML from ${url}`);
      return;
    }
    
    // Extract free zone name from title
    const pageTitle = $('title').text().trim();
    const name = pageTitle.replace(/\s*-\s*UAE Free Zones.*$/i, '').trim();
    
    if (!name) {
      console.error(`Could not extract free zone name from ${url}`);
      return;
    }
    
    console.log(`Processing free zone: ${name}`);
    
    // Extract description (look for the longest paragraph in the card-body sections)
    let description = '';
    $('.card-body p').each((_, element) => {
      const text = this.extractText($, element);
      if (text.length > 50 && description.length < text.length) {
        description = text;
      }
    });
    
    // Extract location
    let location = 'UAE';
    $('.card-body').each((_, element) => {
      const text = this.extractText($, element);
      if (text.includes('located in')) {
        const locationMatch = text.match(/located in\s+([^\.]+)/i);
        if (locationMatch && locationMatch[1]) {
          location = locationMatch[1].trim();
        }
      }
    });
    
    // Extract benefits
    const benefits = [];
    $('h2:contains("Business facilities")')
      .next('.card-body')
      .find('li')
      .each((_, element) => {
        const benefit = this.extractText($, element);
        if (benefit) benefits.push(benefit);
      });
    
    // Extract license types
    const licenseTypes = [];
    $('h2:contains("Types of licenses available")')
      .next('.card-body')
      .find('li')
      .each((_, element) => {
        const licenseType = this.extractText($, element);
        if (licenseType) licenseTypes.push(licenseType);
      });
    
    // Extract facilities/districts
    const facilities = [];
    $('h2, h3').each((_, header) => {
      const headerText = this.extractText($, header);
      if (headerText.includes('District') || headerText.includes('Facilities') || headerText.includes('Parks')) {
        $(header).nextUntil('h2, h3').find('p').each((_, p) => {
          const text = this.extractText($, p);
          if (text.length > 20) {
            facilities.push(text);
          }
        });
      }
    });
    
    // Extract website URL if available
    let website = '';
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().toLowerCase();
      if (href && 
          (text.includes('official') || text.includes('website')) && 
          href.startsWith('http') && 
          !href.includes('uaefreezones.com')) {
        website = href;
      }
    });
    
    // Extract setup costs if available
    const setupCost = {};
    $('h2, h3').each((_, header) => {
      const headerText = this.extractText($, header).toLowerCase();
      if (headerText.includes('cost') || headerText.includes('fee') || headerText.includes('price')) {
        const costSection = $(header).nextUntil('h2, h3');
        let costsText = '';
        costSection.find('p, li').each((_, element) => {
          costsText += this.extractText($, element) + ' ';
        });
        
        // Try to extract cost figures
        const currencyMatches = costsText.match(/(?:AED|USD|EUR|DHR)\s*\d[\d\,\.]+/g);
        if (currencyMatches && currencyMatches.length > 0) {
          setupCost.estimates = currencyMatches;
        } else {
          setupCost.description = costsText.substring(0, 200).trim();
        }
      }
    });
    
    // Extract industries or business activities
    const industries = [];
    $('h2, h3').each((_, header) => {
      const headerText = this.extractText($, header).toLowerCase();
      if (headerText.includes('business activit') || headerText.includes('industr') || headerText.includes('sector')) {
        $(header).nextUntil('h2, h3').find('li').each((_, li) => {
          const industry = this.extractText($, li);
          if (industry) industries.push(industry);
        });
      }
    });
    
    // Create data object with all extracted information
    const data = {
      name,
      description,
      location,
      benefits,
      licenseTypes,
      facilities,
      website,
      setupCost,
      industries,
      source: this.defaultSource,
      url
    };
    
    // Save to database
    await this.upsertFreeZone(data);
  }
  
  /**
   * Upsert free zone data to the database
   */
  async upsertFreeZone(data) {
    try {
      // Check if free zone already exists
      const checkQuery = 'SELECT id FROM free_zones WHERE name = $1';
      const checkResult = await this.executeQuery(checkQuery, [data.name]);
      
      if (checkResult.rows.length > 0) {
        // Update existing free zone
        const id = checkResult.rows[0].id;
        const updateQuery = `
          UPDATE free_zones 
          SET description = $1, 
              location = $2, 
              benefits = $3, 
              license_types = $4, 
              facilities = $5, 
              website = $6, 
              setup_cost = $7, 
              industries = $8,
              last_updated = NOW() 
          WHERE id = $9
        `;
        
        await this.executeQuery(updateQuery, [
          data.description,
          data.location,
          JSON.stringify(data.benefits),
          JSON.stringify(data.licenseTypes),
          JSON.stringify(data.facilities),
          data.website,
          JSON.stringify(data.setupCost),
          JSON.stringify(data.industries),
          id
        ]);
        
        console.log(`Updated free zone: ${data.name}`);
      } else {
        // Insert new free zone
        const insertQuery = `
          INSERT INTO free_zones 
          (name, description, location, benefits, license_types, facilities, website, setup_cost, industries, last_updated) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        `;
        
        await this.executeQuery(insertQuery, [
          data.name,
          data.description,
          data.location,
          JSON.stringify(data.benefits),
          JSON.stringify(data.licenseTypes),
          JSON.stringify(data.facilities),
          data.website,
          JSON.stringify(data.setupCost),
          JSON.stringify(data.industries)
        ]);
        
        console.log(`Inserted new free zone: ${data.name}`);
      }
    } catch (error) {
      console.error(`Error upserting free zone ${data.name}: ${error.message}`);
    }
  }
}

/**
 * Function to run the UAE Free Zones scraper
 */
async function scrapeUAEFreeZones(options = {}) {
  const scraper = new UAEFreeZonesScraper(options);
  return await scraper.scrape();
}

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Starting UAE Free Zones scraper directly");
  scrapeUAEFreeZones()
    .then(() => {
      console.log("UAE Free Zones scraper completed");
      process.exit(0);
    })
    .catch(error => {
      console.error("Error running UAE Free Zones scraper:", error);
      process.exit(1);
    });
}

export { scrapeUAEFreeZones, UAEFreeZonesScraper };