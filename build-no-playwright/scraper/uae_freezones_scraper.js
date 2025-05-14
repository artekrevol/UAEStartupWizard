// scraper/uae_freezones_scraper.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import pg from 'pg';
const { Pool } = pg;

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Scrapes UAE freezones data from uaefreezones.com
 */
async function scrapeUAEFreeZones() {
  const baseURL = 'https://www.uaefreezones.com';
  console.log('Starting scraping UAEFreeZones.com');
  
  try {
    // Get homepage to find freezone links
    const homepageResponse = await axios.get(baseURL);
    const $ = cheerio.load(homepageResponse.data);
    
    // Find all free zone links
    const freeZoneLinks = [];
    $('a[href*="fz_"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && href.includes('fz_') && href.endsWith('.html')) {
        // Normalize URL
        const fullUrl = href.startsWith('http') ? href : 
                      href.startsWith('/') ? `${baseURL}${href}` : 
                      `${baseURL}/${href}`;
        
        if (!freeZoneLinks.includes(fullUrl)) {
          freeZoneLinks.push(fullUrl);
        }
      }
    });
    
    console.log(`Found ${freeZoneLinks.length} free zone links`);
    
    // Process each free zone page
    for (const fzLink of freeZoneLinks) {
      await scrapeFreeZonePage(fzLink);
    }
    
    console.log('Completed UAE Free Zones scraping');
    return true;
  } catch (error) {
    console.error('Error scraping UAE Free Zones:', error.message);
    return false;
  }
}

/**
 * Scrapes individual free zone page
 */
async function scrapeFreeZonePage(url) {
  try {
    console.log(`Scraping ${url}`);
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Extract free zone name from title
    const pageTitle = $('title').text().trim();
    const name = pageTitle.replace(/\s*-\s*UAE Free Zones.*$/i, '').trim();
    
    // Extract description
    let description = '';
    $('.card-body p').each((_, element) => {
      const text = $(element).text().trim();
      if (text.length > 50 && description.length < text.length) {
        description = text;
      }
    });
    
    // Extract location
    let location = 'UAE';
    $('.card-body').each((_, element) => {
      const text = $(element).text();
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
        benefits.push($(element).text().trim());
      });
    
    // Extract license types
    const licenseTypes = [];
    $('h2:contains("Types of licenses available")')
      .next('.card-body')
      .find('li')
      .each((_, element) => {
        licenseTypes.push($(element).text().trim());
      });
    
    // Extract facilities
    const facilities = [];
    $('h2, h3').each((_, header) => {
      const headerText = $(header).text().trim();
      if (headerText.includes('District') || headerText.includes('Facilities') || headerText.includes('Parks')) {
        $(header).nextUntil('h2, h3').find('p').each((_, p) => {
          const text = $(p).text().trim();
          if (text.length > 20) {
            facilities.push(text);
          }
        });
      }
    });
    
    // Extract website URL from the page if available
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
      const headerText = $(header).text().toLowerCase();
      if (headerText.includes('cost') || headerText.includes('fee') || headerText.includes('price')) {
        const costSection = $(header).nextUntil('h2, h3');
        let costsText = '';
        costSection.find('p, li').each((_, element) => {
          costsText += $(element).text().trim() + ' ';
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
      const headerText = $(header).text().toLowerCase();
      if (headerText.includes('business activit') || headerText.includes('industr') || headerText.includes('sector')) {
        $(header).nextUntil('h2, h3').find('li').each((_, li) => {
          industries.push($(li).text().trim());
        });
      }
    });
    
    // Save to database
    await upsertFreeZone({
      name,
      description,
      location,
      benefits,
      licenseTypes,
      facilities,
      website,
      setupCost,
      industries
    });
    
    console.log(`Completed scraping for ${name}`);
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
  }
}

/**
 * Upsert free zone data to database
 */
async function upsertFreeZone(data) {
  try {
    // Check if free zone exists
    const checkResult = await pool.query(
      'SELECT id FROM free_zones WHERE name = $1',
      [data.name]
    );
    
    if (checkResult.rows.length > 0) {
      // Update existing free zone
      const id = checkResult.rows[0].id;
      await pool.query(
        `UPDATE free_zones 
         SET description = $1, 
             location = $2, 
             benefits = $3, 
             license_types = $4, 
             facilities = $5, 
             website = $6, 
             setup_cost = $7, 
             industries = $8,
             last_updated = NOW() 
         WHERE id = $9`,
        [
          data.description,
          data.location,
          JSON.stringify(data.benefits),
          JSON.stringify(data.licenseTypes),
          JSON.stringify(data.facilities),
          data.website,
          JSON.stringify(data.setupCost),
          JSON.stringify(data.industries),
          id
        ]
      );
      console.log(`Updated free zone: ${data.name}`);
    } else {
      // Insert new free zone
      await pool.query(
        `INSERT INTO free_zones 
         (name, description, location, benefits, license_types, facilities, website, setup_cost, industries, last_updated) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          data.name,
          data.description,
          data.location,
          JSON.stringify(data.benefits),
          JSON.stringify(data.licenseTypes),
          JSON.stringify(data.facilities),
          data.website,
          JSON.stringify(data.setupCost),
          JSON.stringify(data.industries)
        ]
      );
      console.log(`Inserted new free zone: ${data.name}`);
    }
  } catch (error) {
    console.error(`Error upserting free zone ${data.name}:`, error.message);
  }
}

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Starting UAE Free Zones scraper directly");
  scrapeUAEFreeZones().then(() => {
    console.log("UAE Free Zones scraper completed");
    process.exit(0);
  }).catch(error => {
    console.error("Error running UAE Free Zones scraper:", error);
    process.exit(1);
  });
}

export { scrapeUAEFreeZones };