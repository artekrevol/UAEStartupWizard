import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from '../server/db.js';
import { freeZones } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// List of URLs with information about UAE free zones
const FREE_ZONE_URLS = [
  {
    url: 'https://www.uaefreezones.com/dubai-freezones.html',
    selector: '.freeZone-card',
    nameSelector: 'h3',
    descriptionSelector: 'p',
    transform: ($el) => {
      const name = $el.find('h3').text().trim();
      const description = $el.find('p').text().trim();
      const benefits = $el.find('li').map((i, el) => $(el).text().trim()).get();
      return { name, description, benefits };
    }
  },
  // Add more sources as needed
];

// Structured data for major UAE free zones
const UAE_FREE_ZONES = [
  {
    name: "Dubai Multi Commodities Centre (DMCC)",
    description: "World's leading free zone for commodities trade and enterprise.",
    location: "Dubai, UAE",
    benefits: [
      "100% business ownership",
      "0% corporate and personal income tax",
      "State-of-the-art infrastructure",
      "Strategic location",
      "Industry-focused services"
    ],
    requirements: [
      "Business plan required",
      "Minimum share capital requirements vary by activity",
      "Passport copies",
      "CV of shareholders",
      "Bank reference letter"
    ],
    industries: [
      "Trading",
      "Financial Services",
      "Professional Services",
      "Commodities",
      "Shipping & Logistics"
    ]
  },
  {
    name: "Dubai Internet City (DIC)",
    description: "Technology business community that fosters innovation.",
    location: "Dubai, UAE",
    benefits: [
      "Industry-specific infrastructure",
      "Strategic location",
      "Networking opportunities",
      "100% foreign ownership",
      "Tax exemptions"
    ],
    requirements: [
      "Technology-related business activity",
      "Approval from free zone authority",
      "Business plan",
      "Passport copies",
      "Company profile"
    ],
    industries: [
      "Software Development",
      "IT Services",
      "Digital Media",
      "Telecommunications",
      "IoT & Smart Solutions"
    ]
  },
  {
    name: "Abu Dhabi Global Market (ADGM)",
    description: "International financial centre with its own jurisdiction and common law framework.",
    location: "Abu Dhabi, UAE",
    benefits: [
      "Independent jurisdiction based on Common Law",
      "World-class regulatory framework",
      "Double tax treaties access",
      "100% foreign ownership",
      "0% tax environment"
    ],
    requirements: [
      "Must meet regulatory requirements",
      "Financial substance requirements",
      "Physical office space",
      "Business plan",
      "KYC documentation"
    ],
    industries: [
      "Financial Services",
      "Wealth Management",
      "Professional Services",
      "FinTech",
      "Asset Management"
    ]
  },
  {
    name: "Dubai South (Dubai World Central)",
    description: "Integrated urban destination built around Al Maktoum International Airport.",
    location: "Dubai, UAE",
    benefits: [
      "100% foreign ownership",
      "Proximity to world's largest airport",
      "Strategic location between Dubai and Abu Dhabi",
      "Integrated logistics platform",
      "Complete business ecosystem"
    ],
    requirements: [
      "Application form",
      "Business plan",
      "Passport copies",
      "Company profile",
      "Bank reference letter"
    ],
    industries: [
      "Aviation",
      "Logistics",
      "E-commerce",
      "Exhibition & Events",
      "Manufacturing"
    ]
  },
  {
    name: "Dubai Healthcare City (DHCC)",
    description: "Healthcare free zone dedicated to enhancing the city's healthcare delivery system.",
    location: "Dubai, UAE",
    benefits: [
      "100% foreign ownership",
      "Tax exemptions",
      "Specialized healthcare ecosystem",
      "World-class infrastructure",
      "Strategic location"
    ],
    requirements: [
      "Healthcare-related activities",
      "Professional qualifications",
      "License application",
      "Business plan",
      "Financial information"
    ],
    industries: [
      "Healthcare Services",
      "Medical Education",
      "Research & Development",
      "Wellness & Rehabilitation",
      "Pharmaceutical"
    ]
  },
  {
    name: "Dubai Media City (DMC)",
    description: "Business community dedicated to media and creative industries.",
    location: "Dubai, UAE",
    benefits: [
      "100% foreign ownership",
      "Tax exemptions",
      "Media industry ecosystem",
      "Strategic location",
      "Networking opportunities"
    ],
    requirements: [
      "Media-related business activity",
      "Approval from free zone authority",
      "Business plan",
      "Passport copies",
      "Corporate documentation"
    ],
    industries: [
      "Media Production",
      "Broadcasting",
      "Publishing",
      "Advertising",
      "Digital Content Creation"
    ]
  },
  {
    name: "Sharjah Media City (Shams)",
    description: "Entrepreneurial free zone focused on innovation and creativity.",
    location: "Sharjah, UAE",
    benefits: [
      "Affordable licensing options",
      "100% foreign ownership",
      "Tax exemptions",
      "Simplified setup procedures",
      "Flexible business solutions"
    ],
    requirements: [
      "Application form",
      "Passport copies",
      "No objection certificate",
      "Business plan for some activities",
      "Professional qualifications for specific activities"
    ],
    industries: [
      "Media",
      "Creative Industries",
      "Technology",
      "Publishing",
      "Consulting Services"
    ]
  },
  {
    name: "Ajman Free Zone",
    description: "Business-friendly free zone known for cost-effective solutions.",
    location: "Ajman, UAE",
    benefits: [
      "Low setup and operational costs",
      "100% foreign ownership",
      "Strategic location",
      "Proximity to major airports and seaports",
      "No currency restrictions"
    ],
    requirements: [
      "Application form",
      "Passport copies",
      "Business plan for specific licenses",
      "Bank reference letter",
      "CV of owners"
    ],
    industries: [
      "Trading",
      "Service Sector",
      "Manufacturing",
      "E-commerce",
      "Education"
    ]
  },
  {
    name: "Ras Al Khaimah Economic Zone (RAKEZ)",
    description: "Premium business zone offering customized business solutions.",
    location: "Ras Al Khaimah, UAE",
    benefits: [
      "Low cost setup and operations",
      "100% foreign ownership",
      "Strategic location",
      "Flexible office solutions",
      "Industry-specific facilities"
    ],
    requirements: [
      "Application form",
      "Passport copies",
      "Business plan",
      "CV of shareholders",
      "No objection certificate"
    ],
    industries: [
      "Manufacturing",
      "Trading",
      "Educational",
      "Media",
      "Professional Services"
    ]
  },
  {
    name: "Fujairah Free Zone",
    description: "Business hub with strategic location on the Gulf of Oman.",
    location: "Fujairah, UAE",
    benefits: [
      "100% foreign ownership",
      "100% repatriation of capital and profits",
      "No currency restrictions",
      "Strategic location outside the Gulf",
      "Cost-effective business solutions"
    ],
    requirements: [
      "Application form",
      "Passport copies",
      "Business plan",
      "Bank reference",
      "CV of directors"
    ],
    industries: [
      "Trading",
      "Manufacturing",
      "Oil & Gas",
      "Shipping",
      "Logistics"
    ]
  }
];

/**
 * Scrapes free zone data from various sources
 */
async function scrapeFreeZones() {
  console.log('Starting UAE free zones scraper...');
  
  // First, insert our structured data
  try {
    for (const freeZone of UAE_FREE_ZONES) {
      await upsertFreeZone(freeZone);
    }
    console.log(`Processed ${UAE_FREE_ZONES.length} UAE free zones from structured data`);
  } catch (error) {
    console.error('Error while inserting structured free zone data:', error);
  }
  
  // Attempt to scrape additional data from websites
  for (const source of FREE_ZONE_URLS) {
    try {
      console.log(`Attempting to scrape data from ${source.url}`);
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      const freeZoneElements = $(source.selector);
      console.log(`Found ${freeZoneElements.length} potential free zones`);
      
      freeZoneElements.each((i, el) => {
        const $el = $(el);
        const freeZoneData = source.transform($el);
        
        if (freeZoneData.name) {
          upsertFreeZone(freeZoneData);
        }
      });
    } catch (error) {
      console.error(`Error scraping ${source.url}:`, error.message);
    }
  }
}

/**
 * Insert or update a free zone in the database
 */
async function upsertFreeZone(freeZoneData) {
  try {
    // Check if free zone already exists
    const [existingFreeZone] = await db
      .select()
      .from(freeZones)
      .where(eq(freeZones.name, freeZoneData.name));
    
    if (existingFreeZone) {
      // Update existing free zone
      await db.update(freeZones)
        .set({
          description: freeZoneData.description,
          location: freeZoneData.location,
          benefits: freeZoneData.benefits,
          requirements: freeZoneData.requirements,
          industries: freeZoneData.industries,
          lastUpdated: new Date()
        })
        .where(eq(freeZones.id, existingFreeZone.id));
      
      console.log(`Updated existing free zone: ${freeZoneData.name}`);
    } else {
      // Insert new free zone
      await db.insert(freeZones).values({
        name: freeZoneData.name,
        description: freeZoneData.description,
        location: freeZoneData.location || null,
        benefits: freeZoneData.benefits || [],
        requirements: freeZoneData.requirements || [],
        industries: freeZoneData.industries || [],
        lastUpdated: new Date()
      });
      
      console.log(`Added new free zone: ${freeZoneData.name}`);
    }
  } catch (error) {
    console.error(`Error upserting free zone ${freeZoneData.name}:`, error);
  }
}

export { scrapeFreeZones };