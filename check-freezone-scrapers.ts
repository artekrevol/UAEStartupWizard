import { db } from './server/db';
import { freeZones } from './shared/schema';

// Map of known free zones that have specialized scrapers
const specializedScraperMap = {
  'Dubai Multi Commodities Centre': 'DMCC', 
  'Dubai Multi Commodities Centre (DMCC)': 'DMCC',
  'Sharjah Airport International Free Zone': 'SAIF Zone',
  'Ajman Free Zone': 'Ajman',
  // Add other specialized scrapers here
};

// Function to check which free zones have specialized scrapers
async function checkFreeZoneScrapers() {
  try {
    console.log('Checking scrapers for all free zones in the database...');
    
    // Get all free zones
    const allFreeZones = await db.select().from(freeZones);
    
    console.log(`Found ${allFreeZones.length} free zones in the database\n`);
    
    // Group by scraper type
    const withSpecializedScrapers: string[] = [];
    const coveredByGeneralScraper: string[] = [];
    const missingScrapers: string[] = [];
    
    // Check each free zone
    for (const zone of allFreeZones) {
      const zoneName = zone.name || 'Unnamed Zone';
      
      // Check if we have a specialized scraper for this free zone
      if (specializedScraperMap[zoneName]) {
        withSpecializedScrapers.push(`${zoneName} (${specializedScraperMap[zoneName]} Scraper)`);
      }
      // Check if zone has a website (can be scraped by general scraper)
      else if (zone.website) {
        coveredByGeneralScraper.push(`${zoneName} (${zone.website})`);
      }
      // No scraper and no website
      else {
        missingScrapers.push(zoneName);
      }
    }
    
    // Report findings
    console.log('\n--- Free Zones with Specialized Scrapers ---');
    if (withSpecializedScrapers.length === 0) {
      console.log('None');
    } else {
      withSpecializedScrapers.forEach((zone, i) => {
        console.log(`${i+1}. ${zone}`);
      });
    }
    
    console.log('\n--- Free Zones Covered by General Website Scraper ---');
    if (coveredByGeneralScraper.length === 0) {
      console.log('None');
    } else {
      coveredByGeneralScraper.forEach((zone, i) => {
        console.log(`${i+1}. ${zone}`);
      });
    }
    
    console.log('\n--- Free Zones Missing Scrapers (No Website) ---');
    if (missingScrapers.length === 0) {
      console.log('None');
    } else {
      missingScrapers.forEach((zone, i) => {
        console.log(`${i+1}. ${zone}`);
      });
    }
    
    // Calculate coverage statistics
    const totalZones = allFreeZones.length;
    const scrapableCoverage = ((withSpecializedScrapers.length + coveredByGeneralScraper.length) / totalZones) * 100;
    
    console.log('\n--- Coverage Summary ---');
    console.log(`Total Free Zones: ${totalZones}`);
    console.log(`Zones with Specialized Scrapers: ${withSpecializedScrapers.length} (${((withSpecializedScrapers.length / totalZones) * 100).toFixed(1)}%)`);
    console.log(`Zones with Website (General Scraper): ${coveredByGeneralScraper.length} (${((coveredByGeneralScraper.length / totalZones) * 100).toFixed(1)}%)`);
    console.log(`Zones Missing Scrapers: ${missingScrapers.length} (${((missingScrapers.length / totalZones) * 100).toFixed(1)}%)`);
    console.log(`Total Scraper Coverage: ${scrapableCoverage.toFixed(1)}%`);
    
  } catch (err) {
    console.error('Error checking free zone scrapers:', err);
  }
}

// Run the function
checkFreeZoneScrapers().catch(console.error).finally(() => {
  process.exit(0);
});