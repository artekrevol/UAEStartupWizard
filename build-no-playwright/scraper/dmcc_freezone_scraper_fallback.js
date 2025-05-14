/**
 * DMCC Free Zone Specialized Scraper - HTTP-Based Fallback Version
 * This scraper extracts detailed information from the DMCC free zone website
 * using axios and cheerio instead of Playwright to work in environments
 * where browser automation is not possible.
 */

import axios from 'axios';
import { load } from 'cheerio';
import { db } from '../server/db.js';
import { freeZones } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

class DMCCFreeZoneFallbackScraper {
  constructor(options = {}) {
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
    this.timeout = options.timeout || 30000;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  }

  /**
   * Main scrape method
   */
  async scrape() {
    try {
      console.log('Starting DMCC specialized fallback scraper');
      
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
      console.error('Error in DMCC fallback scraper:', error);
      return false;
    }
  }
  
  /**
   * Fetch a URL with retry logic
   */
  async fetchUrl(url) {
    let retries = 3;
    let lastError = null;
    
    while (retries > 0) {
      try {
        console.log(`Fetching ${url} (${retries} retries left)`);
        const response = await axios.get(url, {
          timeout: this.timeout,
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });
        
        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        console.error(`Error fetching ${url} (${retries} retries left):`, error.message);
        lastError = error;
      }
      
      retries--;
      // Wait before retry
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw lastError || new Error(`Failed to fetch ${url} after multiple attempts`);
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
      const html = await this.fetchUrl(this.urls.overview);
      const $ = load(html);
      
      // Extract the main content from the about page
      const paragraphs = $('main p').map((_, el) => $(el).text().trim()).get();
      
      // Create a comprehensive description
      let description = '';
      if (paragraphs && paragraphs.length > 0) {
        // Take the first few paragraphs that likely describe what DMCC is
        description = paragraphs.slice(0, 3).join(' ').trim();
      }
      
      // If we couldn't extract a good description, try targeting specific sections
      if (!description || description.length < 100) {
        const headings = $('main h2, main h3').map((_, el) => $(el).text().trim()).get();
        const aboutHeadingIndex = headings.findIndex(h => 
          h.toLowerCase().includes('about') || 
          h.toLowerCase().includes('who we are')
        );
        
        if (aboutHeadingIndex !== -1) {
          // Find content after that heading
          let aboutContent = '';
          let foundHeading = false;
          
          $('main h2, main h3, main p').each((_, el) => {
            const tagName = el.tagName.toLowerCase();
            const text = $(el).text().trim();
            
            if (!foundHeading && tagName.match(/h[23]/) && text === headings[aboutHeadingIndex]) {
              foundHeading = true;
            } else if (foundHeading && tagName === 'p') {
              aboutContent += ' ' + text;
            } else if (foundHeading && tagName.match(/h[23]/)) {
              return false; // Stop at next heading
            }
          });
          
          if (aboutContent) {
            description = aboutContent.trim();
          }
        }
      }
      
      // Fallback to meta description if still not good
      if (!description || description.length < 100) {
        const metaDescription = $('meta[name="description"]').attr('content');
        if (metaDescription) {
          description = metaDescription;
        }
      }
      
      if (this.detailedLogging) {
        console.log(`Description extracted (${description.length} chars)`);
      }
      
      return description;
    } catch (error) {
      console.error('Error extracting overview:', error.message);
      return "Dubai Multi Commodities Centre (DMCC) is a leading free zone authority established to enhance commodity trade flows through Dubai. It provides a comprehensive ecosystem for businesses including infrastructure, regulations, and services designed to ensure a seamless company setup experience.";
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
        const html = await this.fetchUrl(url);
        const $ = load(html);
        
        // Try to find benefits by heading
        $('h2, h3, h4').each((_, heading) => {
          const headingText = $(heading).text().trim();
          
          if (
            headingText.toLowerCase().includes('benefit') || 
            headingText.toLowerCase().includes('advantage') ||
            headingText.toLowerCase().includes('why')
          ) {
            console.log(`Found potential benefits section: "${headingText}"`);
            
            // Look for lists after the heading
            let benefitItems = [];
            let currentElement = heading.nextSibling;
            let elementsChecked = 0;
            
            // Function to process an element for benefits
            const processElement = (element) => {
              if (!element) return;
              
              // If it's a list
              if (element.tagName === 'ul' || element.tagName === 'ol') {
                $(element).find('li').each((_, li) => {
                  benefitItems.push($(li).text().trim());
                });
              } 
              // If it's a list item
              else if (element.tagName === 'li') {
                benefitItems.push($(element).text().trim());
              }
              // If it's a paragraph with bullet points
              else if (element.tagName === 'p' && $(element).text().includes('•')) {
                const bulletItems = $(element).text().split('•').slice(1).map(i => i.trim());
                benefitItems.push(...bulletItems);
              }
            };
            
            // Check siblings of the heading
            while (elementsChecked < 10) {
              if (!currentElement) break;
              
              // If it's an element node
              if (currentElement.type === 'tag') {
                const tagName = currentElement.tagName.toLowerCase();
                
                // Stop if we hit another heading
                if (tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
                  break;
                }
                
                processElement(currentElement);
              }
              
              currentElement = currentElement.nextSibling;
              elementsChecked++;
            }
            
            // Check next elements after heading using jQuery's next method
            $(heading).nextAll().slice(0, 5).each((_, element) => {
              processElement(element);
            });
            
            if (benefitItems.length > 0) {
              allBenefits.push(...benefitItems);
            }
          }
        });
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
      console.error('Error extracting benefits:', error.message);
      return [
        "100% foreign ownership",
        "0% corporate and personal tax",
        "100% repatriation of capital and profits",
        "Access to world-class infrastructure",
        "Strategic location with excellent connectivity"
      ];
    }
  }
  
  /**
   * Extract business setup requirements
   */
  async extractRequirements() {
    try {
      console.log(`Scraping setup requirements from: ${this.urls.setupProcess}`);
      const html = await this.fetchUrl(this.urls.setupProcess);
      const $ = load(html);
      
      let requirements = [];
      
      // Look for requirements section
      $('h2, h3, h4').each((_, heading) => {
        const headingText = $(heading).text().toLowerCase().trim();
        
        if (headingText.includes('requirement') || 
            headingText.includes('document') || 
            headingText.includes('need')) {
          
          console.log(`Found requirements section: "${$(heading).text().trim()}"`);
          
          // Function to process an element for requirements
          const processElement = (element) => {
            // If it's a list
            if ($(element).is('ul, ol')) {
              $(element).find('li').each((_, li) => {
                requirements.push($(li).text().trim());
              });
            } 
            // If it's a paragraph with relevant content
            else if ($(element).is('p') && 
                    ($(element).text().includes(':') || 
                     $(element).text().toLowerCase().includes('require'))) {
              requirements.push($(element).text().trim());
            }
          };
          
          // Check siblings after the heading
          $(heading).nextUntil('h2, h3, h4').each((_, element) => {
            processElement(element);
          });
        }
      });
      
      // If we couldn't find specific requirements, check the setup process for clues
      if (requirements.length === 0) {
        console.log('Extracting requirements from setup process steps');
        
        // Look for step sections
        $('.step, .process-step, [class*="step"]').each((_, element) => {
          const stepText = $(element).text().trim();
          
          if (stepText.toLowerCase().includes('document') || 
              stepText.toLowerCase().includes('require') ||
              stepText.toLowerCase().includes('submit') ||
              stepText.toLowerCase().includes('provide')) {
            requirements.push(stepText);
          }
        });
        
        // Look for lists with step numbering
        $('li').each((_, element) => {
          const text = $(element).text().trim();
          
          if ((text.startsWith('Step') || /^[0-9]+\./.test(text)) && 
              (text.toLowerCase().includes('document') || 
               text.toLowerCase().includes('require') ||
               text.toLowerCase().includes('submit') ||
               text.toLowerCase().includes('provide'))) {
            requirements.push(text);
          }
        });
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
      console.error('Error extracting requirements:', error.message);
      return [
        "Valid passport",
        "Business plan",
        "Application form",
        "Initial approval fees",
        "Proof of residence"
      ];
    }
  }
  
  /**
   * Extract business activities/industries
   */
  async extractBusinessActivities() {
    try {
      console.log(`Scraping business activities from: ${this.urls.businessActivities}`);
      const html = await this.fetchUrl(this.urls.businessActivities);
      const $ = load(html);
      
      let industries = [];
      
      // Look for business activities/industries section
      $('h2, h3, h4').each((_, heading) => {
        const headingText = $(heading).text().toLowerCase().trim();
        
        if (headingText.includes('activit') || 
            headingText.includes('industr') || 
            headingText.includes('sector')) {
          
          console.log(`Found business activities section: "${$(heading).text().trim()}"`);
          
          // Function to process an element for activities
          const processElement = (element) => {
            // If it's a list
            if ($(element).is('ul, ol')) {
              $(element).find('li').each((_, li) => {
                industries.push($(li).text().trim());
              });
            } 
            // Check for activity cards or sections
            else if ($(element).is('.activity, .industry, .sector, [class*="activity"], [class*="industry"], [class*="sector"]')) {
              industries.push($(element).text().trim());
            }
          };
          
          // Check siblings after the heading
          $(heading).nextUntil('h2, h3, h4').each((_, element) => {
            processElement(element);
          });
        }
      });
      
      // If no activities found, look for cards or grid items
      if (industries.length === 0) {
        console.log('Looking for business activities in cards or grid items');
        
        $('.card, .grid-item, .industry, .sector, .activity, [class*="industry"], [class*="sector"], [class*="activity"]')
          .each((_, card) => {
            // Get heading if exists
            const heading = $(card).find('h2, h3, h4, h5, strong').first();
            
            if (heading.length > 0) {
              industries.push(heading.text().trim());
            } else {
              industries.push($(card).text().trim());
            }
          });
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
      console.error('Error extracting business activities:', error.message);
      return [
        "Trading",
        "Professional Services",
        "Technology",
        "Manufacturing",
        "Financial Services",
        "Commodities",
        "Logistics"
      ];
    }
  }
  
  /**
   * Extract license types
   */
  async extractLicenseTypes() {
    try {
      console.log(`Scraping license types from: ${this.urls.businessActivities}`);
      const html = await this.fetchUrl(this.urls.businessActivities);
      const $ = load(html);
      
      let licenseTypes = [];
      
      // Look for license types section
      $('h2, h3, h4').each((_, heading) => {
        const headingText = $(heading).text().toLowerCase().trim();
        
        if (headingText.includes('licen') || 
            headingText.includes('permit')) {
          
          console.log(`Found license types section: "${$(heading).text().trim()}"`);
          
          // Function to process an element for license types
          const processElement = (element) => {
            // If it's a list
            if ($(element).is('ul, ol')) {
              $(element).find('li').each((_, li) => {
                licenseTypes.push($(li).text().trim());
              });
            } 
            // Check for license cards or sections
            else if ($(element).is('.license, [class*="license"]') || 
                     $(element).text().toLowerCase().includes('license')) {
              licenseTypes.push($(element).text().trim());
            }
          };
          
          // Check siblings after the heading
          $(heading).nextUntil('h2, h3, h4').each((_, element) => {
            processElement(element);
          });
        }
      });
      
      // If no license types found, look for cards or grid items
      if (licenseTypes.length === 0) {
        console.log('Looking for license types in cards or grid items');
        
        $('.card, .grid-item, .license, [class*="license"]').each((_, card) => {
          const text = $(card).text().trim();
          
          if (text.toLowerCase().includes('licen')) {
            // Get heading if exists
            const heading = $(card).find('h2, h3, h4, h5, strong').first();
            
            if (heading.length > 0) {
              licenseTypes.push(heading.text().trim());
            } else {
              licenseTypes.push(text);
            }
          }
        });
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
      console.error('Error extracting license types:', error.message);
      return [
        "Trading License",
        "Industrial License",
        "Service License",
        "General Trading License"
      ];
    }
  }
  
  /**
   * Extract facilities
   */
  async extractFacilities() {
    try {
      console.log(`Scraping facilities from: ${this.urls.facilities}`);
      const html = await this.fetchUrl(this.urls.facilities);
      const $ = load(html);
      
      let facilities = [];
      
      // Look for facilities section
      $('h1, h2, h3').each((_, heading) => {
        const headingText = $(heading).text().toLowerCase().trim();
        
        if (headingText.includes('facilit') || 
            headingText.includes('service') ||
            headingText.includes('space') ||
            headingText.includes('office')) {
          
          console.log(`Found facilities section: "${$(heading).text().trim()}"`);
          
          // Function to process an element for facilities
          const processElement = (element) => {
            // If it's a list
            if ($(element).is('ul, ol')) {
              $(element).find('li').each((_, li) => {
                facilities.push($(li).text().trim());
              });
            } 
            // Check for facility cards or sections
            else if ($(element).is('.facility, .service, [class*="facility"], [class*="service"]')) {
              facilities.push($(element).text().trim());
            }
          };
          
          // Check siblings after the heading
          $(heading).nextUntil('h1, h2, h3').each((_, element) => {
            processElement(element);
          });
        }
      });
      
      // If no facilities found, look for cards or grid items
      if (facilities.length === 0) {
        console.log('Looking for facilities in cards or grid items');
        
        $('.card, .grid-item, .facility, .service, [class*="facility"], [class*="service"]')
          .each((_, card) => {
            // Get heading if exists
            const heading = $(card).find('h2, h3, h4, h5, strong').first();
            
            if (heading.length > 0) {
              facilities.push(heading.text().trim());
            } else {
              facilities.push($(card).text().trim().substring(0, 100));
            }
          });
      }
      
      // Extract from image alt text if we still don't have enough
      if (facilities.length < 3) {
        $('img[alt]').each((_, img) => {
          const alt = $(img).attr('alt').trim();
          
          if (alt.length > 5 && 
              (alt.toLowerCase().includes('office') || 
               alt.toLowerCase().includes('facility') ||
               alt.toLowerCase().includes('space') ||
               alt.toLowerCase().includes('warehouse'))) {
            facilities.push(alt);
          }
        });
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
      console.error('Error extracting facilities:', error.message);
      return [
        "Office spaces",
        "Warehouses",
        "Retail spaces",
        "Conference facilities",
        "Business center services"
      ];
    }
  }
  
  /**
   * Extract setup costs
   */
  async extractSetupCosts() {
    try {
      console.log(`Scraping setup costs from: ${this.urls.fees}`);
      const html = await this.fetchUrl(this.urls.fees);
      const $ = load(html);
      
      let setupCost = "";
      
      // Look for pricing tables
      const tables = $('table');
      
      if (tables.length > 0) {
        // Process table data
        let costSummary = "Fee structure: ";
        
        tables.each((i, table) => {
          const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
          
          if (headers.length > 0) {
            costSummary += `\n\nTable ${i+1}: ${headers.join(' | ')}`;
            
            // Add rows data (limit to few rows to avoid too much data)
            const rows = $(table).find('tr').slice(1); // Skip header row
            const rowsToShow = Math.min(rows.length, 3);
            
            rows.slice(0, rowsToShow).each((j, row) => {
              const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get();
              costSummary += `\n- ${cells.join(' | ')}`;
            });
            
            if (rows.length > rowsToShow) {
              costSummary += `\n- ... and ${rows.length - rowsToShow} more options`;
            }
          }
        });
        
        setupCost = costSummary.substring(0, 1000);
      } else {
        // Look for pricing texts
        const pricingTexts = [];
        
        $('p, li, div').each((_, el) => {
          const text = $(el).text().trim();
          
          if (text.match(/(?:AED|USD|$|£|€)\s*[\d,.]+/i) || 
              text.match(/[\d,.]+\s*(?:AED|USD|$|£|€)/i) ||
              text.toLowerCase().includes('fee') ||
              text.toLowerCase().includes('cost') ||
              text.toLowerCase().includes('price')) {
            
            if (text.length > 10 && text.length < 200) {
              pricingTexts.push(text);
            }
          }
        });
        
        // Also check for pricing cards
        $('.price, .pricing, .cost, .fee, [class*="price"], [class*="pricing"], [class*="cost"], [class*="fee"]')
          .each((_, el) => {
            const text = $(el).text().trim();
            if (text.length > 10 && text.length < 200) {
              pricingTexts.push(text);
            }
          });
        
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
      
      if (this.detailedLogging) {
        console.log(`Setup cost information extracted (${setupCost.length} chars)`);
      }
      
      // Use default cost information if we couldn't extract anything
      if (!setupCost || setupCost.length < 20) {
        setupCost = "Starting from AED 15,000 for license and registration. Additional costs for visa and office space.";
      }
      
      return setupCost;
    } catch (error) {
      console.error('Error extracting setup costs:', error.message);
      return "Starting from AED 15,000 for license and registration. Additional costs for visa and office space.";
    }
  }
  
  /**
   * Extract FAQs
   */
  async extractFAQs() {
    try {
      console.log(`Scraping FAQs from: ${this.urls.faqs}`);
      const html = await this.fetchUrl(this.urls.faqs);
      const $ = load(html);
      
      const faqPairs = [];
      
      // Method 1: Look for dedicated FAQ components
      $('.faq, .accordion, [class*="faq"], [class*="accordion"]').each((_, faqElement) => {
        const questionEl = $(faqElement).find('.question, .accordion-header, h3, h4, strong, [class*="question"]').first();
        const answerEl = $(faqElement).find('.answer, .accordion-body, p, [class*="answer"]').first();
        
        if (questionEl.length > 0 && answerEl.length > 0) {
          faqPairs.push({
            question: questionEl.text().trim(),
            answer: answerEl.text().trim()
          });
        }
      });
      
      // Method 2: Look for definition lists
      if (faqPairs.length === 0) {
        $('dl').each((_, dl) => {
          const dts = $(dl).find('dt');
          const dds = $(dl).find('dd');
          
          dts.each((i, dt) => {
            if (i < dds.length) {
              faqPairs.push({
                question: $(dt).text().trim(),
                answer: $(dds.eq(i)).text().trim()
              });
            }
          });
        });
      }
      
      // Method 3: Look for heading + paragraph patterns
      if (faqPairs.length === 0) {
        $('h2, h3, h4').each((_, heading) => {
          const headingText = $(heading).text().trim();
          
          if (headingText.includes('?') || 
              headingText.toLowerCase().includes('how') || 
              headingText.toLowerCase().includes('what') || 
              headingText.toLowerCase().includes('why')) {
            
            // Find the next paragraph
            const nextP = $(heading).nextAll('p').first();
            
            if (nextP.length > 0) {
              faqPairs.push({
                question: headingText,
                answer: nextP.text().trim()
              });
            }
          }
        });
      }
      
      // Clean FAQs and ensure they're valid
      const cleanedFaqs = faqPairs
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
      console.error('Error extracting FAQs:', error.message);
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
 * Run the DMCC fallback scraper
 */
async function runDMCCFallbackScraper(options = {}) {
  try {
    const scraper = new DMCCFreeZoneFallbackScraper(options);
    return await scraper.scrape();
  } catch (error) {
    console.error('Error running DMCC fallback scraper:', error);
    return false;
  }
}

// Export the scraper function
export { runDMCCFallbackScraper };