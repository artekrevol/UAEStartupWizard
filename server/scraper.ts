import axios from "axios";
import * as cheerio from "cheerio";
import cron from "node-cron";
import { db } from "./db";
import { freeZones, establishmentGuides } from "@shared/schema";
import { log } from "./vite";
import { Agent } from "https";

const MOEC_BASE_URL = "https://www.moec.gov.ae";
const FREE_ZONES_URL = `${MOEC_BASE_URL}/en/free-zones`;
const ESTABLISHING_COMPANIES_URL = `${MOEC_BASE_URL}/en/establishing-companies`;

// Configure axios with SSL settings
const axiosInstance = axios.create({
  httpsAgent: new Agent({
    rejectUnauthorized: false,
    secureProtocol: "TLS_method"
  })
});

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Error fetching ${url}: ${errorMessage}`, "scraper");
    return null;
  }
}

async function scrapeFreeZones() {
  const html = await fetchPage(FREE_ZONES_URL);
  if (!html) return;

  const $ = cheerio.load(html);
  const freeZonesList: Array<{
    name: string;
    description: string;
    location: string;
    benefits: string[];
    requirements: string[];
    industries: string[];
  }> = [];

  // Extract free zones information
  $('.free-zone-item').each((_, element) => {
    const freeZone = {
      name: $(element).find('.zone-name').text().trim(),
      description: $(element).find('.zone-description').text().trim(),
      location: $(element).find('.zone-location').text().trim(),
      benefits: $(element).find('.zone-benefits li').map((_, li) => $(li).text().trim()).get(),
      requirements: $(element).find('.zone-requirements li').map((_, li) => $(li).text().trim()).get(),
      industries: $(element).find('.zone-industries li').map((_, li) => $(li).text().trim()).get(),
    };
    freeZonesList.push(freeZone);
  });

  // Update database with new data
  for (const zone of freeZonesList) {
    try {
      await db.insert(freeZones).values({
        name: zone.name,
        description: zone.description,
        location: zone.location,
        benefits: zone.benefits,
        requirements: zone.requirements,
        industries: zone.industries,
        lastUpdated: new Date(),
      });
      log(`Updated free zone: ${zone.name}`, "scraper");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error updating free zone ${zone.name}: ${errorMessage}`, "scraper");
    }
  }

  log(`Updated ${freeZonesList.length} free zones`, "scraper");
}

async function scrapeEstablishmentGuides() {
  const html = await fetchPage(ESTABLISHING_COMPANIES_URL);
  if (!html) return;

  const $ = cheerio.load(html);
  const guidesList: Array<{
    category: string;
    title: string;
    content: string;
    requirements: string[];
    documents: string[];
    steps: Array<{ title: string; description: string }>;
  }> = [];

  // Extract establishment guides
  $('.establishment-guide').each((_, element) => {
    const guide = {
      category: $(element).find('.guide-category').text().trim(),
      title: $(element).find('.guide-title').text().trim(),
      content: $(element).find('.guide-content').text().trim(),
      requirements: $(element).find('.guide-requirements li').map((_, li) => $(li).text().trim()).get(),
      documents: $(element).find('.required-documents li').map((_, li) => $(li).text().trim()).get(),
      steps: $(element).find('.establishment-steps .step').map((_, step) => ({
        title: $(step).find('.step-title').text().trim(),
        description: $(step).find('.step-description').text().trim(),
      })).get(),
    };
    guidesList.push(guide);
  });

  // Update database with new data
  for (const guide of guidesList) {
    try {
      await db.insert(establishmentGuides).values({
        category: guide.category,
        title: guide.title,
        content: guide.content,
        requirements: guide.requirements,
        documents: guide.documents,
        steps: guide.steps,
        lastUpdated: new Date(),
      });
      log(`Updated establishment guide: ${guide.title}`, "scraper");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error updating guide ${guide.title}: ${errorMessage}`, "scraper");
    }
  }

  log(`Updated ${guidesList.length} establishment guides`, "scraper");
}

// Initialize scraper
export function initializeScraper() {
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
  scrapeFreeZones().catch(error => log(`Initial free zones scrape error: ${error.message}`, "scraper"));
  scrapeEstablishmentGuides().catch(error => log(`Initial establishment guides scrape error: ${error.message}`, "scraper"));
}