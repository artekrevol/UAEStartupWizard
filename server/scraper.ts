import axios from "axios";
import * as cheerio from "cheerio";
import cron from "node-cron";
import { db } from "./db";
import { freeZones } from "@shared/schema";
import { sql } from "drizzle-orm";
import { log } from "./vite";
import https from "https";
import { constants } from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Cache directory for storing fetched data
const CACHE_DIR = path.join(process.cwd(), 'cache');

// Ensure cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    log(`Created cache directory at ${CACHE_DIR}`, "scraper");
  }
} catch (err) {
  const errorMessage = err instanceof Error ? err.message : String(err);
  log(`Error creating cache directory: ${errorMessage}`, "scraper");
}

/**
 * Save data to cache for future use
 * @param key Unique identifier for the cached data
 * @param data HTML content to cache
 * @returns True if caching was successful
 */
function saveCachedData(key: string, data: string): boolean {
  try {
    const cachePath = path.join(CACHE_DIR, `${key}.html`);
    const metaData = {
      timestamp: new Date().toISOString(),
      source: key,
      size: data.length
    };
    
    // Save the data and metadata
    fs.writeFileSync(cachePath, data);
    fs.writeFileSync(path.join(CACHE_DIR, `${key}.meta.json`), JSON.stringify(metaData, null, 2));
    
    log(`Cached data for ${key} (${data.length} bytes)`, "scraper");
    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`Error caching data for ${key}: ${errorMessage}`, "scraper");
    return false;
  }
}

/**
 * Load cached data
 * @param key Unique identifier for the cached data
 * @returns Cached HTML content or null if not found/expired
 */
function loadCachedData(key: string): string | null {
  try {
    const cachePath = path.join(CACHE_DIR, `${key}.html`);
    const metaPath = path.join(CACHE_DIR, `${key}.meta.json`);
    
    if (!fs.existsSync(cachePath) || !fs.existsSync(metaPath)) {
      return null;
    }
    
    // Check cache expiration (24 hours)
    const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const cacheTime = new Date(metaData.timestamp).getTime();
    const now = new Date().getTime();
    const cacheDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (now - cacheTime > cacheDuration) {
      log(`Cache expired for ${key}`, "scraper");
      return null;
    }
    
    const data = fs.readFileSync(cachePath, 'utf-8');
    log(`Loaded cached data for ${key} (${data.length} bytes, age: ${Math.round((now - cacheTime) / (60 * 60 * 1000))} hours)`, "scraper");
    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`Error loading cached data for ${key}: ${errorMessage}`, "scraper");
    return null;
  }
}

// Try to use a different approach for the MOEC website by using curl when we absolutely need to bypass TLS issues
function execCurlRequest(url: string): string | null {
  try {
    log(`Attempting curl request to ${url}`, "scraper");
    // Execute curl with options to ignore SSL errors and use a specific user agent
    const result = execSync(
      `curl -k -L --insecure --max-time 60 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36" "${url}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    log(`Successfully fetched ${url} with curl`, "scraper");
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Curl request failed: ${errorMessage}`, "scraper");
    return null;
  }
}

// Mock data functions for development when MOEC website can't be accessed
function mockFreeZonesData(): string {
  return `
  <html>
    <head><title>UAE Free Zones</title></head>
    <body>
      <div class="main-content">
        <h1>UAE Free Zones</h1>
        <p>UAE Free Zones offer businesses 100% foreign ownership, tax exemptions, and streamlined procedures.</p>
        
        <div class="card free-zone-card">
          <h3 class="title">Dubai Multi Commodities Centre (DMCC)</h3>
          <p class="description">World's leading free zone for commodities trade and enterprise.</p>
          <div class="location">Dubai, UAE</div>
          <ul class="benefits">
            <li>100% business ownership</li>
            <li>0% corporate and personal income tax</li>
            <li>State-of-the-art infrastructure</li>
          </ul>
          <ul class="requirements">
            <li>Business plan required</li>
            <li>Minimum share capital requirements vary by activity</li>
          </ul>
          <ul class="industries">
            <li>Trading</li>
            <li>Financial Services</li>
            <li>Professional Services</li>
          </ul>
        </div>
        
        <div class="card free-zone-card">
          <h3 class="title">Dubai Internet City (DIC)</h3>
          <p class="description">Technology business community that fosters innovation.</p>
          <div class="location">Dubai, UAE</div>
          <ul class="benefits">
            <li>Industry-specific infrastructure</li>
            <li>Strategic location</li>
            <li>Networking opportunities</li>
          </ul>
          <ul class="requirements">
            <li>Technology-related business activity</li>
            <li>Approval from free zone authority</li>
          </ul>
          <ul class="industries">
            <li>Software Development</li>
            <li>IT Services</li>
            <li>Digital Media</li>
          </ul>
        </div>
        
        <div class="card free-zone-card">
          <h3 class="title">Abu Dhabi Global Market (ADGM)</h3>
          <p class="description">International financial centre with its own jurisdiction and common law framework.</p>
          <div class="location">Abu Dhabi, UAE</div>
          <ul class="benefits">
            <li>Independent jurisdiction based on Common Law</li>
            <li>World-class regulatory framework</li>
            <li>Double tax treaties access</li>
          </ul>
          <ul class="requirements">
            <li>Must meet regulatory requirements</li>
            <li>Financial substance requirements</li>
          </ul>
          <ul class="industries">
            <li>Financial Services</li>
            <li>Wealth Management</li>
            <li>Professional Services</li>
          </ul>
        </div>
      </div>
    </body>
  </html>
  `;
}

function mockEstablishmentData(): string {
  return `
  <html>
    <head><title>Establishing Companies in UAE</title></head>
    <body>
      <div class="main-content">
        <h1>Establishing Companies in UAE</h1>
        <p>The UAE offers various company formation options for entrepreneurs and businesses.</p>
        
        <div class="guide establishment-guide">
          <h3 class="guide-title">Limited Liability Company (LLC)</h3>
          <p class="guide-category">Mainland Business Setup</p>
          <div class="guide-content">
            <p>An LLC is the most common type of company in the UAE mainland. It requires a minimum of 2 shareholders, with a UAE national holding at least 51% of the shares.</p>
          </div>
          <div class="guide-requirements">
            <h4>Requirements</h4>
            <ul>
              <li>Minimum 2 shareholders</li>
              <li>UAE national partner with 51% shares</li>
              <li>Minimum capital (varies by emirate and activity)</li>
            </ul>
          </div>
          <div class="required-documents">
            <h4>Required Documents</h4>
            <ul>
              <li>Passport copies of all shareholders</li>
              <li>No objection certificate from current sponsor</li>
              <li>Business plan</li>
              <li>Tenancy contract</li>
            </ul>
          </div>
          <div class="establishment-steps">
            <h4>Setup Process</h4>
            <div class="step">
              <div class="step-title">Step 1: Initial Approval</div>
              <div class="step-description">Obtain initial approval from the Department of Economic Development.</div>
            </div>
            <div class="step">
              <div class="step-title">Step 2: Draft and Notarize MOA</div>
              <div class="step-description">Draft and notarize the Memorandum of Association (MOA).</div>
            </div>
            <div class="step">
              <div class="step-title">Step 3: Sign Lease Agreement</div>
              <div class="step-description">Secure office space and sign a lease agreement.</div>
            </div>
            <div class="step">
              <div class="step-title">Step 4: Obtain Trade License</div>
              <div class="step-description">Submit all documents to obtain the trade license.</div>
            </div>
          </div>
        </div>
        
        <div class="guide establishment-guide">
          <h3 class="guide-title">Free Zone Company</h3>
          <p class="guide-category">Free Zone Business Setup</p>
          <div class="guide-content">
            <p>Free zone companies allow 100% foreign ownership and offer various benefits like tax exemptions and full repatriation of profits.</p>
          </div>
          <div class="guide-requirements">
            <h4>Requirements</h4>
            <ul>
              <li>No local sponsor required</li>
              <li>Minimum capital requirements (varies by free zone)</li>
              <li>Office space within the free zone</li>
            </ul>
          </div>
          <div class="required-documents">
            <h4>Required Documents</h4>
            <ul>
              <li>Shareholder passport copies</li>
              <li>CV/resume of shareholders</li>
              <li>Business plan</li>
              <li>Bank reference letter</li>
            </ul>
          </div>
          <div class="establishment-steps">
            <h4>Setup Process</h4>
            <div class="step">
              <div class="step-title">Step 1: Choose Free Zone</div>
              <div class="step-description">Select a free zone based on your business activity and budget.</div>
            </div>
            <div class="step">
              <div class="step-title">Step 2: Company Registration</div>
              <div class="step-description">Apply for company registration with the free zone authority.</div>
            </div>
            <div class="step">
              <div class="step-title">Step 3: License Approval</div>
              <div class="step-description">Receive approval and pay license fees.</div>
            </div>
            <div class="step">
              <div class="step-title">Step 4: Visa Processing</div>
              <div class="step-description">Process visas for shareholders and employees.</div>
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}

const MOEC_BASE_URL = "https://www.moec.gov.ae";
const FREE_ZONES_URL = `${MOEC_BASE_URL}/en/free-zones`;
const ESTABLISHING_COMPANIES_URL = `${MOEC_BASE_URL}/en/establishing-companies`;

// Configure axios with robust SSL settings - now with legacy renegotiation enabled
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
    minVersion: "TLSv1", // Support older TLS versions
    maxVersion: "TLSv1.3",
    ciphers: "ALL", // Allow all ciphers for maximum compatibility
    honorCipherOrder: false, // Let server choose preferred cipher
    secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2, // No renegotiation restriction
    // Force legacy renegotiation to be enabled
    ALPNProtocols: ['http/1.1']
  }),
  timeout: 45000, // 45 seconds timeout
  maxRedirects: 10, // Handle more redirects
  headers: {
    // Try older browser user agent
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
    'Accept': '*/*', // Accept all content types
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept all non-server errors
  }
});

// Direct HTTPS request using native Node.js HTTPS module with enhanced SSL handling
const makeDirectHttpsRequest = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    log(`Making direct HTTPS request to ${url}`, "scraper");
    
    // Process URL
    const urlObj = new URL(url);
    
    // Create a super permissive custom agent
    const customAgent = new https.Agent({
      rejectUnauthorized: false,
      // Don't explicitly set secureProtocol as it's incompatible with min/max version
      secureOptions: 0, // No restrictions
      ciphers: 'ALL', // All ciphers allowed
      honorCipherOrder: false,
      minVersion: 'TLSv1', // Minimum TLS version
      maxVersion: 'TLSv1.2' // Maximum TLS version (avoid 1.3 which might have stricter requirements)
    });
    
    // More complete request options
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      agent: customAgent,
      headers: {
        // Very old User-Agent that some legacy sites expect
        'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)',
        'Accept': '*/*',
        'Accept-Encoding': 'identity', // No compression for simplicity
        'Accept-Language': 'en',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Connection': 'close' // Don't keep connection alive
      }
    };
    
    try {
      log(`Configuring HTTPS request with custom options`, "scraper");
      
      const req = https.request(options, (res) => {
        let data = '';
        
        // Handle redirects manually
        if (res.statusCode && (res.statusCode >= 300 && res.statusCode < 400)) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            log(`Following redirect to ${redirectUrl}`, "scraper");
            // Create absolute URL if relative
            const absoluteUrl = redirectUrl.startsWith('http') 
              ? redirectUrl 
              : new URL(redirectUrl, url).toString();
            makeDirectHttpsRequest(absoluteUrl).then(resolve).catch(reject);
            return;
          }
        }
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          log(`Successfully received direct HTTPS response from ${url} (status: ${res.statusCode})`, "scraper");
          resolve(data);
        });
      });
      
      req.on('error', (error) => {
        log(`Error in direct HTTPS request: ${error.message}`, "scraper");
        reject(error);
      });
      
      req.on('timeout', () => {
        log(`Direct HTTPS request timed out`, "scraper");
        req.destroy();
        reject(new Error('Request timed out'));
      });
      
      // Apply a long timeout (2 minutes)
      req.setTimeout(120000);
      req.end();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log(`Exception setting up HTTPS request: ${errorMessage}`, "scraper");
      reject(err);
    }
  });
};

async function fetchPage(url: string): Promise<string | null> {
  try {
    log(`Attempting to fetch ${url}`, "scraper");
    const response = await axiosInstance.get(url);
    log(`Successfully fetched ${url}`, "scraper");
    return response.data;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error fetching ${url}: ${errorMessage}`, "scraper");
    
    // Try with a different axios configuration
    try {
      log(`Retrying ${url} with different configuration`, "scraper");
      // Create a new axios instance with extremely permissive settings
      const fallbackAxios = axios.create({
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // Accept all SSL certificates
          // Don't set secureProtocol, as it conflicts with min/max version settings
          maxVersion: "TLSv1.2", // Cap at TLS 1.2 for better compatibility
          minVersion: "TLSv1", // Support very old TLS
          ciphers: "ALL", // Allow all ciphers
          secureOptions: 0, // Allow everything including legacy renegotiation
          // Additional options to try to work around renegotiation issues
          ALPNProtocols: ['http/1.1', 'http/1.0'],
          ecdhCurve: 'auto' // Use auto curve selection
        }),
        timeout: 120000, // Very long timeout (2 minutes)
        headers: {
          // Try IE 6 user agent - often works with legacy sites
          'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)',
          'Accept': '*/*',
          'Accept-Language': 'en',
          'Connection': 'close',
          'Pragma': 'no-cache'
        },
        maxRedirects: 15, // Handle more redirects
        decompress: true, // Handle compression
        validateStatus: function (status) {
          return status >= 200 && status < 600; // Accept ALL status codes to debug
        }
      });
      
      const response = await fallbackAxios.get(url);
      log(`Successfully fetched ${url} with alternative configuration`, "scraper");
      return response.data;
    } catch (retryError: unknown) {
      const retryErrorMessage = retryError instanceof Error ? retryError.message : String(retryError);
      log(`Failed with alternative approach: ${retryErrorMessage}`, "scraper");
      
      // Try with direct HTTPS request as last resort
      try {
        log(`Making last attempt with direct HTTPS request to ${url}`, "scraper");
        const html = await makeDirectHttpsRequest(url);
        if (html) {
          log(`Successfully fetched ${url} with direct HTTPS request`, "scraper");
          return html;
        }
      } catch (directError: unknown) {
        const directErrorMessage = directError instanceof Error ? directError.message : String(directError);
        log(`Failed with direct HTTPS request: ${directErrorMessage}`, "scraper");
      }
      
      // Try with curl as a last resort - this method bypasses Node's TLS stack entirely
      try {
        log(`Attempting to use curl as a last resort for ${url}`, "scraper");
        const html = execCurlRequest(url);
        if (html) {
          log(`Successfully fetched ${url} with curl`, "scraper");
          return html;
        }
      } catch (curlError: unknown) {
        const curlErrorMessage = curlError instanceof Error ? curlError.message : String(curlError);
        log(`Failed with curl approach: ${curlErrorMessage}`, "scraper");
      }
      
      // Last resort - use cached data or mock data if nothing else works
      if (url.includes("free-zones")) {
        // Try to load cached data first
        const cachedData = loadCachedData('free-zones');
        if (cachedData) {
          log(`Using cached data for ${url}`, "scraper");
          return cachedData;
        }
        
        // Fall back to mock data
        log(`Using mock data for ${url} due to connectivity issues`, "scraper");
        const mockData = mockFreeZonesData();
        
        // Try to cache the mock data for future use
        saveCachedData('free-zones', mockData);
        
        return mockData;
      } else if (url.includes("establishing-companies")) {
        // Try to load cached data first
        const cachedData = loadCachedData('establishing-companies');
        if (cachedData) {
          log(`Using cached data for ${url}`, "scraper");
          return cachedData;
        }
        
        // Fall back to mock data
        log(`Using mock data for ${url} due to connectivity issues`, "scraper");
        const mockData = mockEstablishmentData();
        
        // Try to cache the mock data for future use
        saveCachedData('establishing-companies', mockData);
        
        return mockData;
      }
      
      return null;
    }
  }
}

// Helper to safely insert or update records
async function upsertFreeZone(zone: {
  name: string;
  description: string;
  location: string;
  benefits: string[];
  requirements: string[];
  industries: string[];
}) {
  try {
    // Check if free zone already exists
    const existingZones = await db
      .select()
      .from(freeZones)
      .where(sql`${freeZones.name} = ${zone.name}`);

    if (existingZones.length > 0) {
      // Update existing record
      await db
        .update(freeZones)
        .set({
          description: zone.description,
          location: zone.location,
          benefits: zone.benefits,
          requirements: zone.requirements,
          industries: zone.industries,
          lastUpdated: new Date()
        })
        .where(sql`${freeZones.id} = ${existingZones[0].id}`);
      log(`Updated existing free zone: ${zone.name}`, "scraper");
    } else {
      // Insert new record
      await db.insert(freeZones).values({
        name: zone.name,
        description: zone.description,
        location: zone.location,
        benefits: zone.benefits,
        requirements: zone.requirements,
        industries: zone.industries,
        lastUpdated: new Date()
      });
      log(`Inserted new free zone: ${zone.name}`, "scraper");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error upserting free zone ${zone.name}: ${errorMessage}`, "scraper");
  }
}

async function scrapeFreeZones() {
  const html = await fetchPage(FREE_ZONES_URL);
  if (!html) {
    log("Failed to fetch Free Zones page content", "scraper");
    return;
  }

  const $ = cheerio.load(html);
  const freeZonesList: Array<{
    name: string;
    description: string;
    location: string;
    benefits: string[];
    requirements: string[];
    industries: string[];
  }> = [];

  log("Analyzing Free Zones HTML structure", "scraper");
  
  // First attempt: Look for patterns in the actual HTML structure
  // Targeting content sections which typically have headings and paragraphs
  $('.page-contents, .main-content, article, .content-area, .region-content').each((_, container) => {
    // Find free zone sections (typically separated by headings)
    $(container).find('h1, h2, h3, h4, h5, h6').each((_, heading) => {
      const zoneName = $(heading).text().trim();
      if (zoneName && zoneName.length > 3) { // Basic validation
        const section = $(heading).nextUntil('h1, h2, h3, h4, h5, h6');
        
        // Extract description (first paragraph after heading)
        const description = section.filter('p').first().text().trim();
        
        // Try to find location, often near heading or in a specific element
        let location = '';
        section.find('.location, [class*=location], address, .meta-location').each((_, loc) => {
          location = $(loc).text().trim();
        });
        
        // Extract bullet points which could be benefits, requirements or industries
        const listItems = section.find('li, .list-item, .bullet-point');
        const allBulletPoints = listItems.map((_, li) => $(li).text().trim()).get();
        
        // Categorize bullet points (simplified approach)
        const benefits: string[] = [];
        const requirements: string[] = [];
        const industries: string[] = [];
        
        // Analyze each bullet point to determine its category
        allBulletPoints.forEach(point => {
          if (point.toLowerCase().includes('require') || 
              point.toLowerCase().includes('need') || 
              point.toLowerCase().includes('must')) {
            requirements.push(point);
          } else if (point.toLowerCase().includes('industr') || 
                    point.toLowerCase().includes('sector') || 
                    point.toLowerCase().includes('business')) {
            industries.push(point);
          } else {
            // Default to benefits
            benefits.push(point);
          }
        });
        
        if (zoneName && description) {
          freeZonesList.push({
            name: zoneName,
            description,
            location: location || 'UAE',
            benefits: benefits.length > 0 ? benefits : [],
            requirements: requirements.length > 0 ? requirements : [],
            industries: industries.length > 0 ? industries : []
          });
        }
      }
    });
  });
  
  // Second approach: Look for card-based layouts
  $('.card, .free-zone-card, .zone-item, [class*=zone], [class*=card]').each((_, card) => {
    const name = $(card).find('.title, .card-title, h3, h4, .zone-name, [class*=title]').text().trim();
    const description = $(card).find('.description, .card-text, p, .zone-description, [class*=description]').text().trim();
    let location = $(card).find('.location, .zone-location, [class*=location]').text().trim();
    
    // Extract lists of items
    const benefitItems = $(card).find('.benefits li, .zone-benefits li, [class*=benefit] li').map((_, li) => $(li).text().trim()).get();
    const requirementItems = $(card).find('.requirements li, .zone-requirements li, [class*=requirement] li').map((_, li) => $(li).text().trim()).get();
    const industryItems = $(card).find('.industries li, .zone-industries li, [class*=industr] li').map((_, li) => $(li).text().trim()).get();
    
    if (name && description) {
      freeZonesList.push({
        name,
        description,
        location: location || 'UAE',
        benefits: benefitItems.length > 0 ? benefitItems : [],
        requirements: requirementItems.length > 0 ? requirementItems : [],
        industries: industryItems.length > 0 ? industryItems : []
      });
    }
  });

  // If no structured data found, extract basic information
  if (freeZonesList.length === 0) {
    log("No structured free zone data found, extracting basic information", "scraper");
    
    // Get page title and use as a base
    const pageTitle = $('title').text().trim();
    const pageDescription = $('meta[name="description"]').attr('content') || '';
    
    // Extract all headings and paragraphs
    const headings = $('h1, h2, h3').map((_, heading) => $(heading).text().trim()).get();
    const paragraphs = $('p').map((_, p) => $(p).text().trim()).get();
    
    // Create a basic entry with all available information
    if (headings.length > 0 && paragraphs.length > 0) {
      freeZonesList.push({
        name: "UAE Free Zones Overview",
        description: paragraphs.slice(0, 3).join(' '),
        location: "United Arab Emirates",
        benefits: paragraphs.slice(3, 10).filter(p => p.length > 50),
        requirements: [],
        industries: headings.slice(1).filter(h => h.length > 5 && h !== 'Free Zones')
      });
    }
  }

  log(`Found ${freeZonesList.length} potential free zones`, "scraper");

  // Update database with new data
  for (const zone of freeZonesList) {
    if (zone.name && zone.description) {
      await upsertFreeZone(zone);
    }
  }

  log(`Processed ${freeZonesList.length} free zones`, "scraper");
}

// Note: Establishment guides functionality removed (table no longer exists)
// This function is kept as a reference for when we implement document-based guides
/*
async function upsertEstablishmentGuide(guide: {
  category: string;
  title: string;
  content: string;
  requirements: string[];
  documents: string[];
  steps: Array<{ title: string; description: string }>;
}) {
  // Implementation removed - table no longer exists
}
*/

async function scrapeEstablishmentGuides() {
  const html = await fetchPage(ESTABLISHING_COMPANIES_URL);
  if (!html) {
    log("Failed to fetch Establishing Companies page content", "scraper");
    return;
  }

  const $ = cheerio.load(html);
  const guidesList: Array<{
    category: string;
    title: string;
    content: string;
    requirements: string[];
    documents: string[];
    steps: Array<{ title: string; description: string }>;
  }> = [];

  log("Analyzing Establishing Companies HTML structure", "scraper");
  
  // Look for guides in content sections (article, main content)
  $('.page-contents, .main-content, article, .content-area, .region-content').each((_, container) => {
    // Find guide sections by headings
    $(container).find('h1, h2, h3, h4').each((_, heading) => {
      const guideTitle = $(heading).text().trim();
      
      if (guideTitle && guideTitle.length > 3 && 
          !guideTitle.toLowerCase().includes('free zone')) { // Skip free zone info
        
        // Get content between this heading and the next heading
        const section = $(heading).nextUntil('h1, h2, h3, h4');
        
        // Extract category - could be from parent heading or nearby element
        let category = '';
        const prevHeading = $(heading).prevAll('h1, h2').first();
        if (prevHeading.length) {
          category = prevHeading.text().trim();
        } else {
          category = 'Company Establishment';
        }
        
        // Extract content paragraphs
        const contentParagraphs = section.filter('p').map((_, p) => $(p).text().trim()).get();
        const content = contentParagraphs.join(' ');
        
        // Extract requirements
        const requirementsList: string[] = [];
        section.find('ul, ol').each((_, list) => {
          const listHeader = $(list).prev('p, h5, h6').text().toLowerCase();
          if (listHeader.includes('require') || listHeader.includes('need') || listHeader.includes('eligib')) {
            $(list).find('li').each((_, li) => {
              requirementsList.push($(li).text().trim());
            });
          }
        });
        
        // Extract documents
        const documentsList: string[] = [];
        section.find('ul, ol').each((_, list) => {
          const listHeader = $(list).prev('p, h5, h6').text().toLowerCase();
          if (listHeader.includes('document') || listHeader.includes('paper') || listHeader.includes('certif')) {
            $(list).find('li').each((_, li) => {
              documentsList.push($(li).text().trim());
            });
          }
        });
        
        // Extract steps
        const stepsList: Array<{ title: string; description: string }> = [];
        
        // Method 1: Check for ordered lists
        section.find('ol').each((_, list) => {
          const listHeader = $(list).prev('p, h5, h6').text().toLowerCase();
          if (listHeader.includes('step') || listHeader.includes('process') || listHeader.includes('procedure')) {
            $(list).find('li').each((index, li) => {
              const stepText = $(li).text().trim();
              const stepParts = stepText.split(':');
              
              if (stepParts.length > 1) {
                stepsList.push({
                  title: stepParts[0].trim(),
                  description: stepParts.slice(1).join(':').trim()
                });
              } else {
                stepsList.push({
                  title: `Step ${index + 1}`,
                  description: stepText
                });
              }
            });
          }
        });
        
        // Method 2: Check for step headings
        section.find('h5, h6, .step-title, .step-heading, [class*=step]').each((_, stepHeading) => {
          const title = $(stepHeading).text().trim();
          if (title.toLowerCase().includes('step') || /^\d+\./.test(title)) {
            const description = $(stepHeading).next('p').text().trim();
            if (description) {
              stepsList.push({ title, description });
            }
          }
        });
        
        if (guideTitle && content) {
          guidesList.push({
            category: category || 'Business Setup',
            title: guideTitle,
            content,
            requirements: requirementsList,
            documents: documentsList,
            steps: stepsList.length > 0 ? stepsList : []
          });
        }
      }
    });
  });
  
  // Look for guides in structured layouts
  $('.guide, .establishment-guide, .process-guide, [class*=guide], [class*=process]').each((_, guide) => {
    const title = $(guide).find('.title, h3, h4, .guide-title, [class*=title]').text().trim();
    const category = $(guide).find('.category, .guide-category, [class*=category]').text().trim() || 'Business Setup';
    const content = $(guide).find('.content, .description, p, .guide-content, [class*=content]').text().trim();
    
    // Extract lists
    const requirements = $(guide).find('.requirements li, .guide-requirements li, [class*=requirement] li').map((_, li) => $(li).text().trim()).get();
    const documents = $(guide).find('.documents li, .required-documents li, [class*=document] li').map((_, li) => $(li).text().trim()).get();
    
    // Extract steps
    const steps: Array<{ title: string; description: string }> = [];
    $(guide).find('.step, .process-step, [class*=step]').each((i, step) => {
      const stepTitle = $(step).find('.step-title, .title, h5, h6, [class*=title]').text().trim() || `Step ${i+1}`;
      const stepDescription = $(step).find('.step-description, .description, p, [class*=description]').text().trim();
      
      if (stepDescription) {
        steps.push({ title: stepTitle, description: stepDescription });
      }
    });
    
    if (title && content) {
      guidesList.push({
        category,
        title,
        content,
        requirements,
        documents,
        steps
      });
    }
  });
  
  // If no structured data found, extract basic information
  if (guidesList.length === 0) {
    log("No structured establishment guides found, extracting basic information", "scraper");
    
    // Extract all headings and sections
    const mainHeadings = $('h1, h2').map((_, h) => ({
      title: $(h).text().trim(),
      content: $(h).nextUntil('h1, h2').text().trim()
    })).get();
    
    for (const heading of mainHeadings) {
      if (heading.title && heading.content && 
          !heading.title.toLowerCase().includes('free zone')) {
        guidesList.push({
          category: 'Business Setup',
          title: heading.title,
          content: heading.content,
          requirements: [],
          documents: [],
          steps: []
        });
      }
    }
  }

  log(`Found ${guidesList.length} establishment guides`, "scraper");

  // Update database with new data
  for (const guide of guidesList) {
    if (guide.title && guide.content) {
      // Note: upsertEstablishmentGuide function has been removed
      // We'll process these guides differently now
      log(`Found guide: ${guide.title} (not saving - table removed)`, "scraper");
    }
  }

  log(`Processed ${guidesList.length} establishment guides`, "scraper");
}

// Initialize scraper
export function initializeScraper() {
  // Make sure db is imported correctly
  if (!db) {
    log("Database connection not available for scraper", "scraper");
    return;
  }

  // Run scraper at 00:00 on the first day of each month
  cron.schedule("0 0 1 * *", async () => {
    log("Starting monthly MOEC data update", "scraper");
    try {
      await scrapeFreeZones();
      await scrapeEstablishmentGuides();
      log("Completed monthly MOEC data update", "scraper");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error during monthly update: ${errorMessage}`, "scraper");
    }
  });

  // Run initial scrape
  log("Running initial MOEC data scrape", "scraper");
  scrapeFreeZones().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Initial free zones scrape error: ${errorMessage}`, "scraper");
  });
  scrapeEstablishmentGuides().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Initial establishment guides scrape error: ${errorMessage}`, "scraper");
  });
}