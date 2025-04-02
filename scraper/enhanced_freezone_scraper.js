/**
 * Enhanced Free Zone Scraper
 * This scraper extracts comprehensive information about UAE free zones from their official websites.
 * It captures details about:
 * - Description and overview
 * - Benefits
 * - Requirements
 * - Industries
 * - License types
 * - Facilities
 * - Setup costs
 * - FAQs
 * - Regulatory requirements
 */

import { PlaywrightScraper } from './utils/playwright_scraper_base.js';
import { db } from '../server/db.js';
import { freeZones } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

class EnhancedFreeZoneScraper extends PlaywrightScraper {
  constructor(options = {}) {
    super({
      name: 'enhanced_freezones',
      description: 'Enhanced scraper for comprehensive free zone data',
      ...options
    });
  }

  /**
   * Update website URLs for free zones
   */
  async updateWebsiteUrls() {
    // Define known websites for major free zones with detailed page URLs for scraping
    const websiteData = [
      { 
        name: 'Dubai Multi Commodities Centre (DMCC)', 
        url: 'https://www.dmcc.ae',
        detailPages: {
          overview: 'https://www.dmcc.ae/about-us',
          businessActivities: 'https://www.dmcc.ae/setup-a-business',
          facilities: 'https://www.dmcc.ae/facilities',
          setupProcess: 'https://www.dmcc.ae/how-to-setup',
          fees: 'https://www.dmcc.ae/setup-a-business/cost',
          faqs: 'https://www.dmcc.ae/faqs'
        }
      },
      {
        name: 'Jebel Ali Free Zone (JAFZA)',
        url: 'https://www.jafza.ae',
        detailPages: {
          overview: 'https://www.jafza.ae/about/',
          businessSectors: 'https://www.jafza.ae/business-sectors/',
          licensing: 'https://www.jafza.ae/licensing/',
          infrastructure: 'https://www.jafza.ae/facilities/',
          fees: 'https://www.jafza.ae/fees/',
          faqs: 'https://www.jafza.ae/faqs/'
        }
      },
      {
        name: 'Dubai Airport Free Zone (DAFZ)',
        url: 'https://www.dafz.ae',
        detailPages: {
          overview: 'https://www.dafz.ae/about-dafz/',
          businessActivities: 'https://www.dafz.ae/setup-a-business/',
          facilities: 'https://www.dafz.ae/facilities/',
          setupProcess: 'https://www.dafz.ae/company-formation/',
          fees: 'https://www.dafz.ae/cost/',
          faqs: 'https://www.dafz.ae/faqs/'
        }
      },
      {
        name: 'Abu Dhabi Global Market (ADGM)',
        url: 'https://www.adgm.com',
        detailPages: {
          overview: 'https://www.adgm.com/about-adgm',
          businessSectors: 'https://www.adgm.com/business',
          regulation: 'https://www.adgm.com/regulation',
          setupProcess: 'https://www.adgm.com/setup',
          fees: 'https://www.adgm.com/fees',
          faqs: 'https://www.adgm.com/faqs'
        }
      },
      {
        name: 'Khalifa Industrial Zone Abu Dhabi (KIZAD)',
        url: 'https://www.kizad.ae',
        detailPages: {
          overview: 'https://www.kizad.ae/about-kizad/',
          businessSectors: 'https://www.kizad.ae/business-sectors/',
          infrastructure: 'https://www.kizad.ae/facilities/',
          licensing: 'https://www.kizad.ae/licensing/',
          fees: 'https://www.kizad.ae/fees/',
          faqs: 'https://www.kizad.ae/faqs/'
        }
      },
      // Additional Free Zones
      { name: 'Dubai Internet City (DIC)', url: 'https://dic.ae' },
      { name: 'Dubai Media City (DMC)', url: 'https://dmc.ae' },
      { name: 'Dubai Healthcare City (DHCC)', url: 'https://dhcc.ae' },
      { name: 'Dubai South (Dubai World Central)', url: 'https://www.dubaisouth.ae' },
      { name: 'Sharjah Media City (Shams)', url: 'https://shams.ae' },
      { name: 'Ajman Free Zone', url: 'https://www.afz.ae' },
      { name: 'Ras Al Khaimah Economic Zone (RAKEZ)', url: 'https://rakez.com' },
      { name: 'Fujairah Free Zone', url: 'https://fujairahfreezone.ae' },
      { name: 'International Free Zone Authority', url: 'https://ifza.com' },
      { name: 'Sharjah Airport International Free Zone', url: 'https://www.saif-zone.com' },
      { name: 'Umm Al Quwain Free Zone - UAQ', url: 'https://uaqftz.com' },
      { name: 'Dubai World Trade Centre Free Zone', url: 'https://dwtc.com/free-zone' },
      { name: 'Dubai Silicon Oasis', url: 'https://www.dsoa.ae' },
      { name: 'Abu Dhabi Airport Free Zone', url: 'https://www.adafz.ae' },
      { name: 'Dubai International Academic City (DIAC)', url: 'https://diacedu.ae' },
      { name: 'Dubai Biotech Research Park', url: 'https://dubiotech.ae' },
      { name: 'Dubai Design District', url: 'https://dubaidesigndistrict.com' },
      { name: 'Dubai Gold and Diamond Park', url: 'https://www.goldanddiamondpark.com' },
      { name: 'Dubai Healthcare City', url: 'https://dhcc.ae' },
      { name: 'Dubai Industrial City', url: 'https://www.dubaiindustrialcity.ae' },
      { name: 'Dubai Knowledge Park (DKP)', url: 'https://dkp.ae' },
      { name: 'Dubai Outsource City (DOC)', url: 'https://doc.ae' },
      { name: 'Abu Dhabi Global Market (ADGM)', url: 'https://www.adgm.com' },
      { name: 'Hamriyah Free Zone Authority (HFZA)', url: 'https://hfza.ae' },
      { name: 'Fujairah Free Zone (FFZA)', url: 'https://fujairahfreezone.ae' }
    ];

    console.log(`Updating website URLs for ${websiteData.length} free zones`);

    for (const data of websiteData) {
      const { name, url, detailPages } = data;
      try {
        // Try exact match first
        let results = await db
          .select()
          .from(freeZones)
          .where(eq(freeZones.name, name));
          
        // If no exact match, try partial match
        if (results.length === 0) {
          results = await db
            .select()
            .from(freeZones)
            .where(eq(freeZones.name, name.split('(')[0].trim()));
        }
          
        if (results.length > 0) {
          const freeZone = results[0];
          
          // Store detailPages in a metadata field if available
          const updateData = { website: url };
          
          if (detailPages) {
            // Store the detail pages for later scraping
            updateData.metadata = {
              ...freeZone.metadata,
              detailPages
            };
            console.log(`Added detailed page URLs for "${name}"`);
          }
          
          // Update the database
          await db
            .update(freeZones)
            .set(updateData)
            .where(eq(freeZones.id, freeZone.id));
            
          console.log(`Updated website for "${name}" to ${url}`);
        } else {
          console.log(`No matching free zone found for "${name}"`);
        }
      } catch (error) {
        console.error(`Error updating website for "${name}":`, error);
      }
    }
  }

  /**
   * Scrape all free zones with website URLs
   */
  async scrape() {
    try {
      await this.initialize();
      
      // First update all website URLs
      await this.updateWebsiteUrls();
      
      // Get all free zones with websites
      const allFreeZones = await db
        .select()
        .from(freeZones)
        .where(db.sql`${freeZones.website} IS NOT NULL AND ${freeZones.website} != ''`);
      
      console.log(`Found ${allFreeZones.length} free zones with websites to scrape`);
      
      // Loop through and scrape each free zone
      for (const freeZone of allFreeZones) {
        try {
          console.log(`Scraping ${freeZone.name} (${freeZone.website})`);
          await this.scrapeFreeZoneWebsite(freeZone);
        } catch (error) {
          console.error(`Error scraping ${freeZone.name}:`, error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in enhanced free zone scraper:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Scrape a specific free zone website
   */
  async scrapeFreeZoneWebsite(freeZone) {
    const website = freeZone.website;
    if (!website) return;
    
    // Check if we have detailed page URLs in metadata
    const detailPages = freeZone.metadata?.detailPages;
    let description, benefits, requirements, industries, licenseTypes, facilities, setupCost, faqs;
    
    // Create a screenshot directory name
    const screenshotPrefix = `${freeZone.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // If we have detailed page URLs, scrape each specific page
    if (detailPages) {
      console.log(`Using detailed page URLs for ${freeZone.name}`);
      
      // Scrape overview/about page
      if (detailPages.overview) {
        await this.navigateTo(detailPages.overview);
        await this.takeScreenshot(`${screenshotPrefix}_overview`);
        description = await this.extractFreeZoneDescription();
      }
      
      // Scrape business activities/sectors page
      if (detailPages.businessActivities || detailPages.businessSectors) {
        const activitiesUrl = detailPages.businessActivities || detailPages.businessSectors;
        await this.navigateTo(activitiesUrl);
        await this.takeScreenshot(`${screenshotPrefix}_business_activities`);
        industries = await this.extractFreeZoneIndustries();
      }
      
      // Scrape facilities/infrastructure page
      if (detailPages.facilities || detailPages.infrastructure) {
        const facilitiesUrl = detailPages.facilities || detailPages.infrastructure;
        await this.navigateTo(facilitiesUrl);
        await this.takeScreenshot(`${screenshotPrefix}_facilities`);
        facilities = await this.extractFreeZoneFacilities();
      }
      
      // Scrape setup process page
      if (detailPages.setupProcess) {
        await this.navigateTo(detailPages.setupProcess);
        await this.takeScreenshot(`${screenshotPrefix}_setup_process`);
        requirements = await this.extractFreeZoneRequirements();
      }
      
      // Scrape fees/costs page
      if (detailPages.fees) {
        await this.navigateTo(detailPages.fees);
        await this.takeScreenshot(`${screenshotPrefix}_fees`);
        setupCost = await this.extractFreeZoneSetupCost();
      }
      
      // Scrape licensing page
      if (detailPages.licensing) {
        await this.navigateTo(detailPages.licensing);
        await this.takeScreenshot(`${screenshotPrefix}_licensing`);
        licenseTypes = await this.extractFreeZoneLicenseTypes();
      }
      
      // Scrape FAQs page
      if (detailPages.faqs) {
        await this.navigateTo(detailPages.faqs);
        await this.takeScreenshot(`${screenshotPrefix}_faqs`);
        faqs = await this.extractFreeZoneFAQs();
      }
      
    } else {
      // Fallback to the original approach - scrape from the homepage
      console.log(`No detailed page URLs for ${freeZone.name}, using homepage scraping`);
      
      // Navigate to the website
      const success = await this.navigateTo(website);
      if (!success) {
        console.error(`Failed to navigate to ${website}`);
        return;
      }
      
      // Take a screenshot for debugging
      await this.takeScreenshot(`${screenshotPrefix}_homepage`);
      
      // Extract data from the homepage
      description = await this.extractFreeZoneDescription();
      benefits = await this.extractFreeZoneBenefits();
      requirements = await this.extractFreeZoneRequirements();
      industries = await this.extractFreeZoneIndustries();
      licenseTypes = await this.extractFreeZoneLicenseTypes();
      facilities = await this.extractFreeZoneFacilities();
      setupCost = await this.extractFreeZoneSetupCost();
      
      // Optional: check for FAQs or other specific pages
      await this.navigateToSubpage(website, 'faq');
      faqs = await this.extractFreeZoneFAQs();
    }
    
    // Update the database with new information
    await this.updateFreeZoneData(freeZone.id, {
      description: description || freeZone.description,
      benefits: benefits || freeZone.benefits,
      requirements: requirements || freeZone.requirements,
      industries: industries || freeZone.industries,
      license_types: licenseTypes || freeZone.license_types,
      facilities: facilities || freeZone.facilities,
      setup_cost: setupCost || freeZone.setup_cost,
      faqs: faqs || freeZone.faqs,
      last_updated: new Date()
    });
    
    console.log(`Updated information for ${freeZone.name}`);
  }

  /**
   * Extract the description of the free zone
   */
  async extractFreeZoneDescription() {
    try {
      // Common selectors for description content
      const selectors = [
        '.about-us-section p', 
        '.about-section p', 
        '.introduction p', 
        '.overview p',
        '[data-section="about"] p',
        '.about-content p'
      ];
      
      for (const selector of selectors) {
        const texts = await this.extractTexts(selector);
        if (texts && texts.length > 0) {
          return texts.join(' ').trim();
        }
      }
      
      // If no specific section found, try to extract content from main sections
      const mainContent = await this.extractTexts('main p, .main-content p');
      if (mainContent && mainContent.length > 0) {
        return mainContent.slice(0, 3).join(' ').trim();
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting free zone description:', error);
      return null;
    }
  }

  /**
   * Extract the benefits of the free zone
   */
  async extractFreeZoneBenefits() {
    try {
      // Common selectors for benefits sections
      const selectors = [
        '.benefits-section li', 
        '.advantages li', 
        '.why-choose-us li',
        '[data-section="benefits"] li',
        '.key-benefits li'
      ];
      
      for (const selector of selectors) {
        const benefits = await this.extractTexts(selector);
        if (benefits && benefits.length > 0) {
          return benefits.map(b => b.trim()).filter(Boolean);
        }
      }
      
      // Try to find benefits in headings followed by paragraphs
      const headings = await this.extractTexts('h2, h3, h4');
      for (const heading of headings || []) {
        if (heading.toLowerCase().includes('benefit') || 
            heading.toLowerCase().includes('advantage') || 
            heading.toLowerCase().includes('why choose')) {
          // Try to find list items after this heading
          const benefitItems = await this.page.$$eval(`h2:contains("${heading}") ~ ul li, h3:contains("${heading}") ~ ul li, h4:contains("${heading}") ~ ul li`, 
            els => els.map(el => el.textContent.trim()));
          
          if (benefitItems && benefitItems.length > 0) {
            return benefitItems.filter(Boolean);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting free zone benefits:', error);
      return null;
    }
  }

  /**
   * Extract the requirements of the free zone
   */
  async extractFreeZoneRequirements() {
    try {
      // Common selectors for requirements sections
      const selectors = [
        '.requirements-section li', 
        '.setup-requirements li', 
        '.registration-process li',
        '[data-section="requirements"] li',
        '.documents-required li'
      ];
      
      for (const selector of selectors) {
        const requirements = await this.extractTexts(selector);
        if (requirements && requirements.length > 0) {
          return requirements.map(r => r.trim()).filter(Boolean);
        }
      }
      
      // Try to find requirements in headings followed by content
      const headings = await this.extractTexts('h2, h3, h4');
      for (const heading of headings || []) {
        if (heading.toLowerCase().includes('require') || 
            heading.toLowerCase().includes('document') || 
            heading.toLowerCase().includes('registration')) {
          // Try to find list items after this heading
          const requirementItems = await this.page.$$eval(`h2:contains("${heading}") ~ ul li, h3:contains("${heading}") ~ ul li, h4:contains("${heading}") ~ ul li`, 
            els => els.map(el => el.textContent.trim()));
          
          if (requirementItems && requirementItems.length > 0) {
            return requirementItems.filter(Boolean);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting free zone requirements:', error);
      return null;
    }
  }

  /**
   * Extract the industries supported by the free zone
   */
  async extractFreeZoneIndustries() {
    try {
      // Common selectors for industries sections
      const selectors = [
        '.industries-section li', 
        '.sectors li', 
        '.business-activities li',
        '[data-section="industries"] li',
        '.supported-industries li'
      ];
      
      for (const selector of selectors) {
        const industries = await this.extractTexts(selector);
        if (industries && industries.length > 0) {
          return industries.map(i => i.trim()).filter(Boolean);
        }
      }
      
      // Try to find industries in headings followed by content
      const headings = await this.extractTexts('h2, h3, h4');
      for (const heading of headings || []) {
        if (heading.toLowerCase().includes('industr') || 
            heading.toLowerCase().includes('sector') || 
            heading.toLowerCase().includes('activit')) {
          // Try to find list items after this heading
          const industryItems = await this.page.$$eval(`h2:contains("${heading}") ~ ul li, h3:contains("${heading}") ~ ul li, h4:contains("${heading}") ~ ul li`, 
            els => els.map(el => el.textContent.trim()));
          
          if (industryItems && industryItems.length > 0) {
            return industryItems.filter(Boolean);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting free zone industries:', error);
      return null;
    }
  }

  /**
   * Extract the license types offered by the free zone
   */
  async extractFreeZoneLicenseTypes() {
    try {
      // Common selectors for license types sections
      const selectors = [
        '.license-types-section li', 
        '.licenses li', 
        '.business-licenses li',
        '[data-section="licenses"] li',
        '.license-options li'
      ];
      
      for (const selector of selectors) {
        const licenseTypes = await this.extractTexts(selector);
        if (licenseTypes && licenseTypes.length > 0) {
          return licenseTypes.map(l => {
            const license = {
              name: l.trim()
            };
            
            // Try to extract additional details if available
            if (l.includes(':')) {
              const parts = l.split(':');
              license.name = parts[0].trim();
              license.description = parts[1].trim();
            }
            
            return license;
          }).filter(l => l.name);
        }
      }
      
      // Try to find license types in headings followed by content
      const headings = await this.extractTexts('h2, h3, h4');
      for (const heading of headings || []) {
        if (heading.toLowerCase().includes('license') || 
            heading.toLowerCase().includes('business type')) {
          // Try to find list items after this heading
          const licenseItems = await this.page.$$eval(`h2:contains("${heading}") ~ ul li, h3:contains("${heading}") ~ ul li, h4:contains("${heading}") ~ ul li`, 
            els => els.map(el => el.textContent.trim()));
          
          if (licenseItems && licenseItems.length > 0) {
            return licenseItems.map(l => ({ name: l })).filter(l => l.name);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting free zone license types:', error);
      return null;
    }
  }

  /**
   * Extract the facilities offered by the free zone
   */
  async extractFreeZoneFacilities() {
    try {
      // Common selectors for facilities sections
      const selectors = [
        '.facilities-section li', 
        '.amenities li', 
        '.infrastructure li',
        '[data-section="facilities"] li',
        '.office-options li'
      ];
      
      for (const selector of selectors) {
        const facilities = await this.extractTexts(selector);
        if (facilities && facilities.length > 0) {
          return facilities.map(f => {
            const facility = {
              name: f.trim()
            };
            
            // Try to extract additional details if available
            if (f.includes(':')) {
              const parts = f.split(':');
              facility.name = parts[0].trim();
              facility.description = parts[1].trim();
            }
            
            return facility;
          }).filter(f => f.name);
        }
      }
      
      // Try to find facilities in headings followed by content
      const headings = await this.extractTexts('h2, h3, h4');
      for (const heading of headings || []) {
        if (heading.toLowerCase().includes('facilit') || 
            heading.toLowerCase().includes('amenities') || 
            heading.toLowerCase().includes('office') ||
            heading.toLowerCase().includes('infrastructure')) {
          // Try to find list items after this heading
          const facilityItems = await this.page.$$eval(`h2:contains("${heading}") ~ ul li, h3:contains("${heading}") ~ ul li, h4:contains("${heading}") ~ ul li`, 
            els => els.map(el => el.textContent.trim()));
          
          if (facilityItems && facilityItems.length > 0) {
            return facilityItems.map(f => ({ name: f })).filter(f => f.name);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting free zone facilities:', error);
      return null;
    }
  }

  /**
   * Extract the setup costs of the free zone
   */
  async extractFreeZoneSetupCost() {
    try {
      // Common selectors for pricing/cost sections
      const selectors = [
        '.pricing-section table', 
        '.costs table', 
        '.fees table',
        '[data-section="pricing"] table',
        '.setup-cost table'
      ];
      
      for (const selector of selectors) {
        const costTable = await this.page.$(selector);
        if (costTable) {
          // Extract the table data
          const tableData = await this.page.$$eval(`${selector} tr`, rows => {
            return rows.map(row => {
              const cells = Array.from(row.querySelectorAll('th, td'));
              return cells.map(cell => cell.textContent.trim());
            });
          });
          
          if (tableData && tableData.length > 0) {
            // Process table data into a structured format
            const costs = {
              header: tableData[0],
              rows: tableData.slice(1)
            };
            
            return costs;
          }
        }
      }
      
      // Try to find cost information in paragraphs
      const costParagraphs = [];
      const headings = await this.extractTexts('h2, h3, h4');
      for (const heading of headings || []) {
        if (heading.toLowerCase().includes('cost') || 
            heading.toLowerCase().includes('price') || 
            heading.toLowerCase().includes('fee') ||
            heading.toLowerCase().includes('payment')) {
          // Try to find paragraphs after this heading
          const costTexts = await this.page.$$eval(`h2:contains("${heading}") ~ p, h3:contains("${heading}") ~ p, h4:contains("${heading}") ~ p`, 
            els => els.slice(0, 3).map(el => el.textContent.trim()));
          
          if (costTexts && costTexts.length > 0) {
            costParagraphs.push(...costTexts);
          }
        }
      }
      
      if (costParagraphs.length > 0) {
        return { description: costParagraphs.join(' ') };
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting free zone setup costs:', error);
      return null;
    }
  }

  /**
   * Extract FAQs from the free zone website
   */
  async extractFreeZoneFAQs() {
    try {
      // Common selectors for FAQ sections
      const selectors = [
        '.faq-section .question, .faq-section .answer', 
        '.faqs .question, .faqs .answer', 
        '.accordion-item h3, .accordion-item div',
        '[data-section="faq"] h3, [data-section="faq"] p'
      ];
      
      for (const selector of selectors) {
        const elements = await this.page.$$(selector);
        if (elements && elements.length > 0) {
          // Extract questions and answers
          const faqs = [];
          for (let i = 0; i < elements.length; i += 2) {
            if (i + 1 < elements.length) {
              const question = await elements[i].textContent();
              const answer = await elements[i + 1].textContent();
              
              if (question && answer) {
                faqs.push({
                  question: question.trim(),
                  answer: answer.trim()
                });
              }
            }
          }
          
          if (faqs.length > 0) {
            return faqs;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting free zone FAQs:', error);
      return null;
    }
  }

  /**
   * Navigate to a subpage of the website
   */
  async navigateToSubpage(baseUrl, page) {
    try {
      // Common variations of subpage URLs
      const variations = [
        `${baseUrl}/${page}`,
        `${baseUrl}/${page}.html`,
        `${baseUrl}/${page}.php`,
        `${baseUrl}/en/${page}`,
        `${baseUrl}/about-us/${page}`
      ];
      
      for (const url of variations) {
        const success = await this.navigateTo(url);
        if (success) {
          console.log(`Successfully navigated to ${url}`);
          return true;
        }
      }
      
      // If direct navigation fails, look for links on the current page
      const links = await this.page.$$('a');
      for (const link of links) {
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        
        if (text && href && 
            (text.toLowerCase().includes(page) || 
             href.toLowerCase().includes(page))) {
          await link.click();
          await this.page.waitForLoadState('domcontentloaded');
          console.log(`Clicked on link to ${page}`);
          return true;
        }
      }
      
      console.log(`Could not navigate to ${page} subpage`);
      return false;
    } catch (error) {
      console.error(`Error navigating to ${page} subpage:`, error);
      return false;
    }
  }

  /**
   * Update free zone data in the database
   */
  async updateFreeZoneData(freeZoneId, data) {
    try {
      // Filter out null or undefined values
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v != null)
      );
      
      // Only update if we have new data
      if (Object.keys(filteredData).length > 0) {
        await db
          .update(freeZones)
          .set(filteredData)
          .where(eq(freeZones.id, freeZoneId));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error updating free zone data for ID ${freeZoneId}:`, error);
      return false;
    }
  }
}

/**
 * Run the enhanced free zone scraper
 */
async function runEnhancedFreeZoneScraper(options = {}) {
  const scraper = new EnhancedFreeZoneScraper(options);
  return await scraper.scrape();
}

// Export the scraper function and class
export { 
  runEnhancedFreeZoneScraper, 
  EnhancedFreeZoneScraper 
};