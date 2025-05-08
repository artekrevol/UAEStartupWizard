
    import { scrapeFreeZones, scrapeEstablishmentGuides } from './server/scraper.ts';
    
    async function runTest() {
      console.log("Starting scraper test...");
      
      try {
        await scrapeFreeZones();
        console.log("Free zones scraping completed");
      } catch (err) {
        console.error("Error scraping free zones:", err);
      }
      
      try {
        await scrapeEstablishmentGuides();
        console.log("Establishment guides scraping completed");
      } catch (err) {
        console.error("Error scraping establishment guides:", err);
      }
      
      console.log("Scraper test completed");
    }
    
    runTest().catch(console.error);
    