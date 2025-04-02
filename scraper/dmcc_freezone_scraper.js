/**
 * DMCC Free Zone Specialized Scraper
 * This scraper extracts detailed information from the DMCC free zone website
 * using specified URLs for different data sections.
 */

import { PlaywrightScraper } from './utils/playwright_scraper_base.js';
import { db } from '../server/db.js';
import { freeZones } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

class DMCCFreeZoneScraper extends PlaywrightScraper {
  constructor(options = {}) {
    super({
      name: 'dmcc_freezone_scraper',
      description: 'Specialized scraper for DMCC free zone',
      ...options
    });
    
    // DMCC specific URLs
    this.urls = {
      overview: 'https://www.dmcc.ae/about-us',
      businessActivities: 'https://www.dmcc.ae/setup-a-business',
      facilities: 'https://www.dmcc.ae/facilities',
      setupProcess: 'https://www.dmcc.ae/how-to-setup',
      fees: 'https://www.dmcc.ae/setup-a-business/cost',
      faqs: 'https://www.dmcc.ae/faqs'
    };
    
    // Additional options
    this.detailedLogging = options.detailedLogging || true;
    this.screenshotPrefix = 'DMCC';
  }

  /**
   * Main scrape method
   */
  async scrape() {
    try {
      console.log('Starting DMCC specialized scraper');
      await this.initialize();
      
      // Get DMCC freezone from database
      const [dmcc] = await db
        .select()
        .from(freeZones)
        .where(eq(freeZones.name, 'Dubai Multi Commodities Centre (DMCC)'));
      
      if (!dmcc) {
        throw new Error('DMCC freezone not found in database');
      }
      
      console.log(`Found DMCC free zone (ID: ${dmcc.id})`);
      
      // Extract data from each URL
      const data = await this.extractAllData();
      
      // Update the database
      await this.updateFreeZone(dmcc.id, data);
      
      console.log('DMCC scraper completed successfully');
      return true;
    } catch (error) {
      console.error('Error in DMCC scraper:', error);
      return false;
    } finally {
      await this.cleanup();
    }
  }
  
  /**
   * Extract all required data from DMCC website
   */
  async extractAllData() {
    const data = {
      description: await this.extractOverview(),
      benefits: await this.extractBenefits(),
      requirements: await this.extractRequirements(),
      industries: await this.extractBusinessActivities(),
      licenseTypes: await this.extractLicenseTypes(),
      facilities: await this.extractFacilities(),
      setupCost: await this.extractSetupCosts(),
      faqs: await this.extractFAQs(),
      lastUpdated: new Date()
    };
    
    if (this.detailedLogging) {
      console.log('Extracted DMCC data summary:');
      console.log(`- Description: ${data.description ? 'Yes (' + data.description.substring(0, 50) + '...)' : 'No'}`);
      console.log(`- Benefits: ${data.benefits?.length || 0} extracted`);
      console.log(`- Requirements: ${data.requirements?.length || 0} extracted`);
      console.log(`- Industries: ${data.industries?.length || 0} extracted`);
      console.log(`- License Types: ${data.licenseTypes?.length || 0} extracted`);
      console.log(`- Facilities: ${data.facilities?.length || 0} extracted`);
      console.log(`- Setup Cost: ${data.setupCost ? 'Yes' : 'No'}`);
      console.log(`- FAQs: ${data.faqs?.length || 0} extracted`);
    }
    
    return data;
  }
  
  /**
   * Extract general overview information
   */
  async extractOverview() {
    try {
      console.log(`Scraping overview from: ${this.urls.overview}`);
      await this.navigateTo(this.urls.overview);
      await this.takeScreenshot(`${this.screenshotPrefix}_overview`);
      
      // Extract the main content from the about page
      const paragraphs = await this.extractTexts('main p');
      
      // Create a comprehensive description
      let description = '';
      if (paragraphs && paragraphs.length > 0) {
        // Take the first few paragraphs that likely describe what DMCC is
        description = paragraphs.slice(0, 3).join(' ').trim();
      }
      
      // If we couldn't extract a good description, try targeting specific sections
      if (!description || description.length < 100) {
        const headings = await this.extractTexts('main h2, main h3');
        const aboutSection = headings.findIndex(h => 
          h.toLowerCase().includes('about') || 
          h.toLowerCase().includes('who we are')
        );
        
        if (aboutSection !== -1) {
          // Try to get content after the about heading
          const aboutContent = await this.page.evaluate((index) => {
            const headings = Array.from(document.querySelectorAll('main h2, main h3'));
            if (headings[index]) {
              let content = '';
              let element = headings[index].nextElementSibling;
              while (element && !['H2', 'H3'].includes(element.tagName)) {
                if (element.tagName === 'P') {
                  content += ' ' + element.textContent.trim();
                }
                element = element.nextElementSibling;
              }
              return content.trim();
            }
            return '';
          }, aboutSection);
          
          if (aboutContent) {
            description = aboutContent;
          }
        }
      }
      
      // Fallback to meta description if still not good
      if (!description || description.length < 100) {
        const metaDescription = await this.extractAttribute('meta[name="description"]', 'content');
        if (metaDescription) {
          description = metaDescription;
        }
      }
      
      if (this.detailedLogging) {
        console.log(`Description extracted (${description.length} chars)`);
      }
      
      return description;
    } catch (error) {
      console.error('Error extracting overview:', error);
      return null;
    }
  }
  
  /**
   * Extract benefits from various pages
   */
  async extractBenefits() {
    try {
      // Check multiple pages for benefits
      const pagesToCheck = [
        this.urls.overview,
        this.urls.businessActivities
      ];
      
      const allBenefits = [];
      
      for (const url of pagesToCheck) {
        console.log(`Looking for benefits on: ${url}`);
        await this.navigateTo(url);
        
        // Try to find benefits by heading
        const headings = await this.extractTexts('h2, h3, h4');
        for (const heading of headings) {
          if (
            heading.toLowerCase().includes('benefit') || 
            heading.toLowerCase().includes('advantage') ||
            heading.toLowerCase().includes('why')
          ) {
            console.log(`Found potential benefits section: "${heading}"`);
            
            // Get benefits list items after this heading
            const benefitItems = await this.page.evaluate((headingText) => {
              const headings = Array.from(document.querySelectorAll('h2, h3, h4'));
              const targetHeading = headings.find(h => h.textContent.includes(headingText));
              
              if (targetHeading) {
                // Look for lists after the heading
                let element = targetHeading.nextElementSibling;
                const benefits = [];
                
                // Check next 10 elements or until another heading
                let count = 0;
                while (element && count < 10 && !['H2', 'H3', 'H4'].includes(element.tagName)) {
                  // Check if element is or contains list items
                  if (element.tagName === 'UL' || element.tagName === 'OL') {
                    const items = Array.from(element.querySelectorAll('li')).map(li => li.textContent.trim());
                    benefits.push(...items);
                  } else if (element.tagName === 'LI') {
                    benefits.push(element.textContent.trim());
                  } else if (element.tagName === 'P' && element.textContent.includes('•')) {
                    // Check for bullet lists in paragraphs
                    const bulletItems = element.textContent.split('•').slice(1).map(i => i.trim());
                    benefits.push(...bulletItems);
                  }
                  
                  element = element.nextElementSibling;
                  count++;
                }
                
                return benefits;
              }
              return [];
            }, heading);
            
            if (benefitItems && benefitItems.length > 0) {
              allBenefits.push(...benefitItems);
            }
          }
        }
      }
      
      // Remove duplicates and clean up
      const uniqueBenefits = [...new Set(allBenefits)].filter(b => 
        b && b.length > 5 && b.length < 200
      );
      
      if (this.detailedLogging) {
        console.log(`Benefits extracted: ${uniqueBenefits.length}`);
        uniqueBenefits.forEach((b, i) => console.log(`  ${i+1}. ${b}`));
      }
      
      // Always include the standard benefits if we couldn't find enough
      if (uniqueBenefits.length < 3) {
        const standardBenefits = [
          "100% foreign ownership",
          "0% corporate and personal tax",
          "100% repatriation of capital and profits",
          "Access to DMCC business hub and services",
          "Global network of trade connections"
        ];
        
        return [...uniqueBenefits, ...standardBenefits.filter(b => !uniqueBenefits.includes(b))];
      }
      
      return uniqueBenefits;
    } catch (error) {
      console.error('Error extracting benefits:', error);
      return [
        "100% foreign ownership",
        "0% corporate and personal tax",
        "100% repatriation of capital and profits"
      ];
    }
  }
  
  /**
   * Extract business setup requirements
   */
  async extractRequirements() {
    try {
      console.log(`Scraping setup requirements from: ${this.urls.setupProcess}`);
      await this.navigateTo(this.urls.setupProcess);
      await this.takeScreenshot(`${this.screenshotPrefix}_requirements`);
      
      // Look for requirements section
      const headings = await this.extractTexts('h2, h3, h4');
      const requirementIndices = headings
        .map((h, i) => h.toLowerCase().includes('requirement') || 
                        h.toLowerCase().includes('document') || 
                        h.toLowerCase().includes('need') ? i : -1)
        .filter(i => i !== -1);
      
      let requirements = [];
      
      if (requirementIndices.length > 0) {
        // Extract requirements from identified sections
        for (const index of requirementIndices) {
          const sectionRequirements = await this.page.evaluate((idx) => {
            const headings = Array.from(document.querySelectorAll('h2, h3, h4'));
            if (headings[idx]) {
              const reqHeading = headings[idx];
              let element = reqHeading.nextElementSibling;
              const items = [];
              
              // Check if next elements are a list or paragraphs with requirements
              while (element && !['H2', 'H3', 'H4'].includes(element.tagName)) {
                if (element.tagName === 'UL' || element.tagName === 'OL') {
                  const listItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent.trim());
                  items.push(...listItems);
                } else if (element.tagName === 'LI') {
                  items.push(element.textContent.trim());
                } else if (element.tagName === 'P' && 
                          (element.textContent.includes(':') || element.textContent.toLowerCase().includes('require'))) {
                  items.push(element.textContent.trim());
                }
                element = element.nextElementSibling;
              }
              return items;
            }
            return [];
          }, index);
          
          if (sectionRequirements && sectionRequirements.length > 0) {
            requirements = [...requirements, ...sectionRequirements];
          }
        }
      }
      
      // If we couldn't find specific requirements, check the setup process for clues
      if (requirements.length === 0) {
        console.log('Extracting requirements from setup process steps');
        
        // Look for setup steps which often contain requirements
        const processSteps = await this.page.evaluate(() => {
          // Find steps or process sections
          const steps = [];
          
          // Look for numbered steps or process sections
          const stepSections = Array.from(document.querySelectorAll('.step, .process-step, [class*="step"]'));
          if (stepSections.length > 0) {
            stepSections.forEach(section => {
              const stepText = section.textContent.trim();
              if (stepText.toLowerCase().includes('document') || 
                  stepText.toLowerCase().includes('require') ||
                  stepText.toLowerCase().includes('submit') ||
                  stepText.toLowerCase().includes('provide')) {
                steps.push(stepText);
              }
            });
          }
          
          // If no dedicated step sections, look for lists with step numbering
          if (steps.length === 0) {
            document.querySelectorAll('li').forEach(li => {
              const text = li.textContent.trim();
              if ((text.startsWith('Step') || /^[0-9]+\./.test(text)) && 
                  (text.toLowerCase().includes('document') || 
                   text.toLowerCase().includes('require') ||
                   text.toLowerCase().includes('submit') ||
                   text.toLowerCase().includes('provide'))) {
                steps.push(text);
              }
            });
          }
          
          return steps;
        });
        
        if (processSteps && processSteps.length > 0) {
          // Extract requirements from process steps
          requirements = processSteps.map(step => {
            // Clean up step text to focus on the requirement
            const cleaned = step.replace(/Step\s*[0-9]+:?/i, '').trim();
            return cleaned;
          });
        }
      }
      
      // Clean requirements
      requirements = requirements
        .filter(r => r && r.length > 3)
        .map(r => r.trim().replace(/^[-*•]/, '').trim())
        .filter((r, i, self) => self.indexOf(r) === i); // Remove duplicates
      
      if (this.detailedLogging) {
        console.log(`Requirements extracted: ${requirements.length}`);
        requirements.forEach((r, i) => console.log(`  ${i+1}. ${r}`));
      }
      
      // Add standard requirements if we couldn't find enough
      if (requirements.length < 3) {
        const standardRequirements = [
          "Valid passport and visa",
          "Business plan",
          "Completed application form",
          "Initial approval fee payment",
          "Proof of address"
        ];
        
        return [...requirements, ...standardRequirements.filter(r => !requirements.some(item => item.includes(r)))];
      }
      
      return requirements;
    } catch (error) {
      console.error('Error extracting requirements:', error);
      return [
        "Valid passport",
        "Business plan",
        "Application form",
        "Initial approval fees"
      ];
    }
  }
  
  /**
   * Extract business activities/industries
   */
  async extractBusinessActivities() {
    try {
      console.log(`Scraping business activities from: ${this.urls.businessActivities}`);
      await this.navigateTo(this.urls.businessActivities);
      await this.takeScreenshot(`${this.screenshotPrefix}_business_activities`);
      
      // Look for business activities/industries section
      const headings = await this.extractTexts('h2, h3, h4');
      const activityIndices = headings
        .map((h, i) => h.toLowerCase().includes('activit') || 
                       h.toLowerCase().includes('industr') || 
                       h.toLowerCase().includes('sector') ? i : -1)
        .filter(i => i !== -1);
      
      let industries = [];
      
      if (activityIndices.length > 0) {
        // Extract activities from identified sections
        for (const index of activityIndices) {
          const sectionActivities = await this.page.evaluate((idx) => {
            const headings = Array.from(document.querySelectorAll('h2, h3, h4'));
            if (headings[idx]) {
              const activityHeading = headings[idx];
              let element = activityHeading.nextElementSibling;
              const items = [];
              
              // Check if next elements are a list or sections with activities
              while (element && !['H2', 'H3', 'H4'].includes(element.tagName)) {
                if (element.tagName === 'UL' || element.tagName === 'OL') {
                  const listItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent.trim());
                  items.push(...listItems);
                } else if (element.tagName === 'LI') {
                  items.push(element.textContent.trim());
                } else if (element.tagName === 'DIV' && element.classList.contains('activity')) {
                  items.push(element.textContent.trim());
                }
                element = element.nextElementSibling;
              }
              return items;
            }
            return [];
          }, index);
          
          if (sectionActivities && sectionActivities.length > 0) {
            industries = [...industries, ...sectionActivities];
          }
        }
      }
      
      // If no activities found, look for cards or grid items that might list industries
      if (industries.length === 0) {
        console.log('Looking for business activities in cards or grid items');
        const cardActivities = await this.page.evaluate(() => {
          // Look for card elements, grid items, or sections that might contain activities
          const items = [];
          
          // Check card elements
          document.querySelectorAll('.card, .grid-item, .industry, .sector, .activity, [class*="industry"], [class*="sector"], [class*="activity"]')
            .forEach(card => {
              // Get heading if exists
              const heading = card.querySelector('h2, h3, h4, h5, strong');
              if (heading) {
                items.push(heading.textContent.trim());
              } else {
                items.push(card.textContent.trim());
              }
            });
            
          return items.filter(item => item.length > 0 && item.length < 100);
        });
        
        if (cardActivities && cardActivities.length > 0) {
          industries = cardActivities;
        }
      }
      
      // Clean industries list
      industries = industries
        .filter(i => i && i.length > 2 && i.length < 100)
        .map(i => i.trim().replace(/^[-*•]/, '').trim())
        .filter((i, idx, self) => self.indexOf(i) === idx); // Remove duplicates
      
      if (this.detailedLogging) {
        console.log(`Business activities/industries extracted: ${industries.length}`);
        industries.forEach((i, idx) => console.log(`  ${idx+1}. ${i}`));
      }
      
      // Add standard industries if we couldn't find enough
      if (industries.length < 3) {
        const standardIndustries = [
          "Trading",
          "Professional Services",
          "Logistics and Shipping",
          "Financial Services",
          "Manufacturing",
          "Technology",
          "Commodities"
        ];
        
        return [...industries, ...standardIndustries.filter(i => !industries.includes(i))];
      }
      
      return industries;
    } catch (error) {
      console.error('Error extracting business activities:', error);
      return [
        "Trading",
        "Services",
        "Industrial",
        "Technology",
        "Manufacturing",
        "Media"
      ];
    }
  }
  
  /**
   * Extract license types
   */
  async extractLicenseTypes() {
    try {
      console.log(`Scraping license types from: ${this.urls.businessActivities}`);
      await this.navigateTo(this.urls.businessActivities);
      await this.takeScreenshot(`${this.screenshotPrefix}_license_types`);
      
      // Look for license types section
      const headings = await this.extractTexts('h2, h3, h4');
      const licenseIndices = headings
        .map((h, i) => h.toLowerCase().includes('licen') || 
                       h.toLowerCase().includes('permit') ? i : -1)
        .filter(i => i !== -1);
      
      let licenseTypes = [];
      
      if (licenseIndices.length > 0) {
        // Extract license types from identified sections
        for (const index of licenseIndices) {
          const sectionLicenses = await this.page.evaluate((idx) => {
            const headings = Array.from(document.querySelectorAll('h2, h3, h4'));
            if (headings[idx]) {
              const licenseHeading = headings[idx];
              let element = licenseHeading.nextElementSibling;
              const items = [];
              
              // Check if next elements are a list or sections with license types
              while (element && !['H2', 'H3', 'H4'].includes(element.tagName)) {
                if (element.tagName === 'UL' || element.tagName === 'OL') {
                  const listItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent.trim());
                  items.push(...listItems);
                } else if (element.tagName === 'LI') {
                  items.push(element.textContent.trim());
                } else if (element.tagName === 'DIV' && 
                          (element.classList.contains('license') || 
                           element.textContent.toLowerCase().includes('license'))) {
                  items.push(element.textContent.trim());
                }
                element = element.nextElementSibling;
              }
              return items;
            }
            return [];
          }, index);
          
          if (sectionLicenses && sectionLicenses.length > 0) {
            licenseTypes = [...licenseTypes, ...sectionLicenses];
          }
        }
      }
      
      // If no license types found, look for cards or grid items
      if (licenseTypes.length === 0) {
        console.log('Looking for license types in cards or grid items');
        const cardLicenses = await this.page.evaluate(() => {
          // Look for card elements, grid items, or sections that might contain license types
          const items = [];
          
          // Check card elements
          document.querySelectorAll('.card, .grid-item, .license, [class*="license"]')
            .forEach(card => {
              // Get heading if exists
              const heading = card.querySelector('h2, h3, h4, h5, strong');
              if (heading) {
                items.push(heading.textContent.trim());
              } else if (card.textContent.toLowerCase().includes('license')) {
                items.push(card.textContent.trim());
              }
            });
            
          return items.filter(item => 
            item.length > 0 && 
            item.length < 100 && 
            item.toLowerCase().includes('licen')
          );
        });
        
        if (cardLicenses && cardLicenses.length > 0) {
          licenseTypes = cardLicenses.map(license => {
            // Extract just the license type name
            if (license.includes(':')) {
              return license.split(':')[0].trim();
            }
            return license.trim();
          });
        }
      }
      
      // Clean license types
      licenseTypes = licenseTypes
        .filter(l => l && l.length > 2 && l.length < 100)
        .map(l => {
          // Clean up and extract just the license type
          let cleaned = l.trim().replace(/^[-*•]/, '').trim();
          if (cleaned.toLowerCase().includes('license')) {
            cleaned = cleaned.replace(/license/i, 'License');
          }
          return cleaned;
        })
        .filter((l, i, self) => self.indexOf(l) === i); // Remove duplicates
      
      if (this.detailedLogging) {
        console.log(`License types extracted: ${licenseTypes.length}`);
        licenseTypes.forEach((l, i) => console.log(`  ${i+1}. ${l}`));
      }
      
      // Add standard license types if we couldn't find enough
      if (licenseTypes.length < 2) {
        const standardLicenseTypes = [
          "Commercial License",
          "Industrial License",
          "Service License",
          "Trading License"
        ];
        
        return [...licenseTypes, ...standardLicenseTypes.filter(l => !licenseTypes.includes(l))];
      }
      
      return licenseTypes;
    } catch (error) {
      console.error('Error extracting license types:', error);
      return [
        "Commercial",
        "Industrial",
        "Service",
        "E-commerce"
      ];
    }
  }
  
  /**
   * Extract facilities
   */
  async extractFacilities() {
    try {
      console.log(`Scraping facilities from: ${this.urls.facilities}`);
      await this.navigateTo(this.urls.facilities);
      await this.takeScreenshot(`${this.screenshotPrefix}_facilities`);
      
      // Look for facilities section
      const headings = await this.extractTexts('h1, h2, h3');
      const facilityIndices = headings
        .map((h, i) => h.toLowerCase().includes('facilit') || 
                      h.toLowerCase().includes('service') ||
                      h.toLowerCase().includes('space') ||
                      h.toLowerCase().includes('office') ? i : -1)
        .filter(i => i !== -1);
      
      let facilities = [];
      
      if (facilityIndices.length > 0) {
        // Extract facilities from identified sections
        for (const index of facilityIndices) {
          const sectionFacilities = await this.page.evaluate((idx) => {
            const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
            if (headings[idx]) {
              const facilityHeading = headings[idx];
              let element = facilityHeading.nextElementSibling;
              const items = [];
              
              // Check if next elements are a list or sections with facilities
              while (element && !['H1', 'H2', 'H3'].includes(element.tagName)) {
                if (element.tagName === 'UL' || element.tagName === 'OL') {
                  const listItems = Array.from(element.querySelectorAll('li')).map(li => li.textContent.trim());
                  items.push(...listItems);
                } else if (element.tagName === 'LI') {
                  items.push(element.textContent.trim());
                } else if (element.tagName === 'DIV' && 
                          (element.classList.contains('facility') || 
                           element.classList.contains('service'))) {
                  items.push(element.textContent.trim());
                }
                element = element.nextElementSibling;
              }
              return items;
            }
            return [];
          }, index);
          
          if (sectionFacilities && sectionFacilities.length > 0) {
            facilities = [...facilities, ...sectionFacilities];
          }
        }
      }
      
      // If no facilities found, look for cards or grid items
      if (facilities.length === 0) {
        console.log('Looking for facilities in cards or grid items');
        const cardFacilities = await this.page.evaluate(() => {
          // Look for card elements, grid items, or sections that might contain facilities
          const items = [];
          
          // Check card elements
          document.querySelectorAll('.card, .grid-item, .facility, .service, [class*="facility"], [class*="service"]')
            .forEach(card => {
              // Get heading if exists
              const heading = card.querySelector('h2, h3, h4, h5, strong');
              if (heading) {
                items.push(heading.textContent.trim());
              } else {
                items.push(card.textContent.trim().substring(0, 100));
              }
            });
            
          return items.filter(item => item.length > 0 && item.length < 100);
        });
        
        if (cardFacilities && cardFacilities.length > 0) {
          facilities = cardFacilities;
        }
      }
      
      // Extract from image alt text if we still don't have enough
      if (facilities.length < 3) {
        const imageAlts = await this.page.evaluate(() => {
          return Array.from(document.querySelectorAll('img[alt]'))
            .map(img => img.alt.trim())
            .filter(alt => 
              alt.length > 5 && 
              (alt.toLowerCase().includes('office') || 
               alt.toLowerCase().includes('facility') ||
               alt.toLowerCase().includes('space') ||
               alt.toLowerCase().includes('warehouse'))
            );
        });
        
        if (imageAlts && imageAlts.length > 0) {
          facilities = [...facilities, ...imageAlts];
        }
      }
      
      // Clean facilities list
      facilities = facilities
        .filter(f => f && f.length > 2 && f.length < 100)
        .map(f => f.trim().replace(/^[-*•]/, '').trim())
        .filter((f, i, self) => self.indexOf(f) === i); // Remove duplicates
      
      if (this.detailedLogging) {
        console.log(`Facilities extracted: ${facilities.length}`);
        facilities.forEach((f, i) => console.log(`  ${i+1}. ${f}`));
      }
      
      // Add standard facilities if we couldn't find enough
      if (facilities.length < 3) {
        const standardFacilities = [
          "Office spaces",
          "Warehouses",
          "Retail spaces",
          "Conference rooms",
          "Business center"
        ];
        
        return [...facilities, ...standardFacilities.filter(f => !facilities.includes(f))];
      }
      
      return facilities;
    } catch (error) {
      console.error('Error extracting facilities:', error);
      return [
        "Modern office spaces",
        "Warehouses",
        "Retail spaces",
        "Manufacturing units"
      ];
    }
  }
  
  /**
   * Extract setup costs
   */
  async extractSetupCosts() {
    try {
      console.log(`Scraping setup costs from: ${this.urls.fees}`);
      await this.navigateTo(this.urls.fees);
      await this.takeScreenshot(`${this.screenshotPrefix}_setup_costs`);
      
      // Look for pricing tables or cost information
      const costData = await this.page.evaluate(() => {
        // First try to find pricing tables
        const tables = document.querySelectorAll('table');
        if (tables.length > 0) {
          // Create structured data from tables
          const tableData = Array.from(tables).map(table => {
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
            const rows = Array.from(table.querySelectorAll('tr')).map(tr => {
              const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
              return cells;
            }).filter(row => row.length > 0);
            
            return { headers, rows };
          });
          
          return { type: 'table', data: tableData };
        }
        
        // If no tables, look for pricing sections
        const pricingTexts = [];
        
        // Look for sections with price mentions
        document.querySelectorAll('p, li, div').forEach(el => {
          const text = el.textContent.trim();
          if (text.match(/(?:AED|USD|$|£|€)\s*[\d,.]+/i) || 
              text.match(/[\d,.]+\s*(?:AED|USD|$|£|€)/i) ||
              text.toLowerCase().includes('fee') ||
              text.toLowerCase().includes('cost') ||
              text.toLowerCase().includes('price')) {
            pricingTexts.push(text);
          }
        });
        
        // Check for pricing cards or plan sections
        document.querySelectorAll('.price, .pricing, .cost, .fee, [class*="price"], [class*="pricing"], [class*="cost"], [class*="fee"]')
          .forEach(el => {
            pricingTexts.push(el.textContent.trim());
          });
        
        return { type: 'text', data: pricingTexts };
      });
      
      let setupCost = "";
      
      if (costData.type === 'table' && costData.data.length > 0) {
        // Process table data
        const tables = costData.data;
        
        // Create a structured summary
        let costSummary = "Fee structure: ";
        
        for (const [i, table] of tables.entries()) {
          if (table.headers.length > 0) {
            costSummary += `\n\nTable ${i+1}: ${table.headers.join(' | ')}`;
            
            // Add rows data (limit to few rows to avoid too much data)
            const rowsToShow = Math.min(table.rows.length, 3);
            for (let j = 0; j < rowsToShow; j++) {
              costSummary += `\n- ${table.rows[j].join(' | ')}`;
            }
            
            if (table.rows.length > rowsToShow) {
              costSummary += `\n- ... and ${table.rows.length - rowsToShow} more options`;
            }
          }
        }
        
        setupCost = costSummary.substring(0, 1000);
      } else if (costData.type === 'text' && costData.data.length > 0) {
        // Process text data about costs
        const pricingTexts = costData.data.filter(text => 
          text.length > 10 && text.length < 200
        );
        
        if (pricingTexts.length > 0) {
          // Extract the most relevant pricing information
          const relevantPricing = pricingTexts
            .filter(text => 
              text.match(/(?:AED|USD|$|£|€)\s*[\d,.]+/i) || 
              text.match(/[\d,.]+\s*(?:AED|USD|$|£|€)/i)
            )
            .slice(0, 5);
          
          if (relevantPricing.length > 0) {
            setupCost = "Costs overview: " + relevantPricing.join(' | ');
          } else {
            // If no specific costs mentioned, use the first few pricing texts
            setupCost = "Costs overview: " + pricingTexts.slice(0, 3).join(' | ');
          }
        }
      }
      
      // If we still don't have cost data, try a more generic approach
      if (!setupCost || setupCost.length < 20) {
        console.log('Using generic approach to find cost information');
        
        // Try to find cost paragraphs
        const costParagraphs = await this.extractTexts('p, li');
        const relevantCosts = costParagraphs.filter(p => 
          p.match(/(?:AED|USD|$|£|€)\s*[\d,.]+/i) || 
          p.match(/[\d,.]+\s*(?:AED|USD|$|£|€)/i) ||
          (p.toLowerCase().includes('cost') && p.length < 200) ||
          (p.toLowerCase().includes('fee') && p.length < 200)
        );
        
        if (relevantCosts.length > 0) {
          setupCost = relevantCosts.slice(0, 3).join(' | ');
        }
      }
      
      if (this.detailedLogging) {
        console.log(`Setup cost information extracted (${setupCost.length} chars)`);
      }
      
      // Use default cost information if we couldn't extract anything
      if (!setupCost || setupCost.length < 20) {
        setupCost = "Starting from AED 15,000 for license and registration. Additional costs for visa and office space.";
      }
      
      return setupCost;
    } catch (error) {
      console.error('Error extracting setup costs:', error);
      return "Starting from AED 15,000 for license and registration. Additional costs for visa and office space.";
    }
  }
  
  /**
   * Extract FAQs
   */
  async extractFAQs() {
    try {
      console.log(`Scraping FAQs from: ${this.urls.faqs}`);
      await this.navigateTo(this.urls.faqs);
      await this.takeScreenshot(`${this.screenshotPrefix}_faqs`);
      
      // Look for FAQ sections and extract Q&A pairs
      const faqs = await this.page.evaluate(() => {
        const faqPairs = [];
        
        // Method 1: Look for dedicated FAQ components
        const faqElements = document.querySelectorAll('.faq, .accordion, [class*="faq"], [class*="accordion"]');
        if (faqElements.length > 0) {
          faqElements.forEach(faqElement => {
            // Try to find question and answer elements
            const questionEl = faqElement.querySelector('.question, .accordion-header, h3, h4, strong, [class*="question"]');
            const answerEl = faqElement.querySelector('.answer, .accordion-body, p, [class*="answer"]');
            
            if (questionEl && answerEl) {
              faqPairs.push({
                question: questionEl.textContent.trim(),
                answer: answerEl.textContent.trim()
              });
            }
          });
        }
        
        // Method 2: Look for definition lists
        if (faqPairs.length === 0) {
          const dlElements = document.querySelectorAll('dl');
          if (dlElements.length > 0) {
            dlElements.forEach(dl => {
              const dts = dl.querySelectorAll('dt');
              const dds = dl.querySelectorAll('dd');
              
              for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
                faqPairs.push({
                  question: dts[i].textContent.trim(),
                  answer: dds[i].textContent.trim()
                });
              }
            });
          }
        }
        
        // Method 3: Look for heading + paragraph patterns
        if (faqPairs.length === 0) {
          // Look for question headings
          const questionHeadings = Array.from(document.querySelectorAll('h2, h3, h4'))
            .filter(h => h.textContent.includes('?') || h.textContent.toLowerCase().includes('how') || 
                         h.textContent.toLowerCase().includes('what') || h.textContent.toLowerCase().includes('why'));
          
          questionHeadings.forEach(heading => {
            let answerElement = heading.nextElementSibling;
            
            // Skip non-content elements
            while (answerElement && (answerElement.tagName === 'BR' || answerElement.textContent.trim() === '')) {
              answerElement = answerElement.nextElementSibling;
            }
            
            if (answerElement && (answerElement.tagName === 'P' || answerElement.tagName === 'DIV')) {
              faqPairs.push({
                question: heading.textContent.trim(),
                answer: answerElement.textContent.trim()
              });
            }
          });
        }
        
        return faqPairs;
      });
      
      // Clean FAQs and ensure they're valid
      const cleanedFaqs = faqs
        .filter(faq => 
          faq.question && faq.answer && 
          faq.question.length > 5 && faq.question.length < 200 &&
          faq.answer.length > 10 && faq.answer.length < 1000
        )
        .map(faq => ({
          question: faq.question.trim().replace(/^[Q]?[:.)] /i, ''),
          answer: faq.answer.trim().replace(/^[A][:.)] /i, '')
        }))
        .filter((faq, i, self) => 
          // Remove duplicates
          self.findIndex(f => f.question === faq.question) === i
        );
      
      if (this.detailedLogging) {
        console.log(`FAQs extracted: ${cleanedFaqs.length}`);
        cleanedFaqs.forEach((faq, i) => {
          console.log(`  ${i+1}. Q: ${faq.question.substring(0, 50)}...`);
          console.log(`     A: ${faq.answer.substring(0, 50)}...`);
        });
      }
      
      // Add standard FAQs if we couldn't find enough
      if (cleanedFaqs.length < 3) {
        const standardFaqs = [
          {
            question: "What are the business activities allowed?",
            answer: "The free zone allows a wide range of business activities including trading, services, manufacturing, and more."
          },
          {
            question: "What is the minimum capital requirement?",
            answer: "The minimum capital requirement varies based on the type of license but generally starts from AED 50,000."
          },
          {
            question: "How long does the setup process take?",
            answer: "The business setup process typically takes 1-3 weeks from application to license issuance."
          }
        ];
        
        // Add standard FAQs that don't overlap with existing ones
        for (const standardFaq of standardFaqs) {
          if (!cleanedFaqs.some(faq => faq.question.includes(standardFaq.question))) {
            cleanedFaqs.push(standardFaq);
          }
        }
      }
      
      return cleanedFaqs;
    } catch (error) {
      console.error('Error extracting FAQs:', error);
      return [
        {
          question: "What are the business activities allowed?",
          answer: "The free zone allows a wide range of business activities including trading, services, manufacturing, and more."
        },
        {
          question: "What is the minimum capital requirement?",
          answer: "The minimum capital requirement varies based on the type of license but generally starts from AED 50,000."
        },
        {
          question: "How long does the setup process take?",
          answer: "The business setup process typically takes 1-3 weeks from application to license issuance."
        }
      ];
    }
  }
  
  /**
   * Update free zone in the database
   */
  async updateFreeZone(freeZoneId, data) {
    try {
      console.log(`Updating free zone with ID ${freeZoneId} in the database`);
      
      // Serialize the FAQs array to JSON string
      const serializedData = {
        ...data,
        faqs: JSON.stringify(data.faqs)
      };
      
      // Update the database
      await db
        .update(freeZones)
        .set(serializedData)
        .where(eq(freeZones.id, freeZoneId));
      
      console.log(`Successfully updated free zone with ID ${freeZoneId}`);
      return true;
    } catch (error) {
      console.error(`Error updating free zone with ID ${freeZoneId}:`, error);
      return false;
    }
  }
}

/**
 * Run the DMCC scraper
 */
async function runDMCCScraper(options = {}) {
  try {
    const scraper = new DMCCFreeZoneScraper(options);
    return await scraper.scrape();
  } catch (error) {
    console.error('Error running DMCC scraper:', error);
    return false;
  }
}

// Export the scraper function
export { runDMCCScraper };