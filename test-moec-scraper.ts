/**
 * Test script for MOEC scraper integration
 * 
 * This script tests if our MOEC scraper can successfully fetch data 
 * with our SSL_OP_LEGACY_SERVER_CONNECT fix.
 */

import { fetchPage } from './server/scraper';

const MOEC_BASE_URL = "https://www.moec.gov.ae";
const FREE_ZONES_URL = `${MOEC_BASE_URL}/en/free-zones`;
const ESTABLISHING_COMPANIES_URL = `${MOEC_BASE_URL}/en/establishing-companies`;

async function testMOECScraper() {
  try {
    console.log("Testing MOEC scraper with our SSL_OP_LEGACY_SERVER_CONNECT fix...");
    
    // Test fetching free zones data
    console.log("\nTesting connection to Free Zones URL:", FREE_ZONES_URL);
    console.log("Attempting to fetch data...");
    
    const freeZonesHTML = await fetchPage(FREE_ZONES_URL);
    
    if (freeZonesHTML) {
      console.log("✅ Successfully fetched Free Zones data");
      console.log(`Received ${freeZonesHTML.length} bytes of data`);
      
      // Check if it's using cached/mock data
      if (freeZonesHTML.includes("unique identifier:") || 
          freeZonesHTML.includes("test-") || 
          freeZonesHTML.includes("CACHE-TEST-")) {
        console.log("⚠️ WARNING: Received cached or mock data, not live data");
      } else {
        console.log("✅ Received live data from MOEC website");
      }
    } else {
      console.error("❌ Failed to fetch Free Zones data");
    }
    
    // Test fetching establishing companies data
    console.log("\nTesting connection to Establishing Companies URL:", ESTABLISHING_COMPANIES_URL);
    console.log("Attempting to fetch data...");
    
    const establishingHTML = await fetchPage(ESTABLISHING_COMPANIES_URL);
    
    if (establishingHTML) {
      console.log("✅ Successfully fetched Establishing Companies data");
      console.log(`Received ${establishingHTML.length} bytes of data`);
      
      // Check if it's using cached/mock data
      if (establishingHTML.includes("unique identifier:") || 
          establishingHTML.includes("test-") || 
          establishingHTML.includes("CACHE-TEST-")) {
        console.log("⚠️ WARNING: Received cached or mock data, not live data");
      } else {
        console.log("✅ Received live data from MOEC website");
      }
    } else {
      console.error("❌ Failed to fetch Establishing Companies data");
    }
    
    // Summary
    if (freeZonesHTML && establishingHTML) {
      console.log("\n✅ SUCCESS: MOEC scraper is working correctly with SSL_OP_LEGACY_SERVER_CONNECT fix");
    } else {
      console.error("\n❌ FAILURE: MOEC scraper still has issues");
    }
    
  } catch (error) {
    console.error("Error testing MOEC scraper:", error);
  }
}

// Run the test
testMOECScraper().catch(console.error);