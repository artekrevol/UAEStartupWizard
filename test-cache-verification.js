/**
 * This script tests whether our application's scraper system
 * correctly loads data from the cache instead of using mock data
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Cache directory
const CACHE_DIR = path.join(process.cwd(), 'cache');

// Unique identifiers for testing
const TEST_UNIQUE_ID = `test-${Date.now()}`;
const FREE_ZONES_UNIQUE_TEXT = `Free Zones with unique identifier: ${TEST_UNIQUE_ID}`;
const ESTABLISHING_UNIQUE_TEXT = `Establishing Companies with unique identifier: ${TEST_UNIQUE_ID}`;

/**
 * Create cache files with unique identifiers that we can check for in logs
 */
function createTestCacheFiles() {
  console.log("📝 Creating test cache files with unique identifiers");

  // Create free zones test cache
  const freeZonesData = `
  <html>
    <head><title>UAE Free Zones Test</title></head>
    <body>
      <div class="main-content">
        <h1>UAE Free Zones</h1>
        <p>${FREE_ZONES_UNIQUE_TEXT}</p>
        
        <div class="card">
          <h3 class="title">Test Free Zone 1</h3>
          <p class="description">This is a test free zone.</p>
        </div>
      </div>
    </body>
  </html>
  `;
  
  fs.writeFileSync(path.join(CACHE_DIR, 'free-zones.html'), freeZonesData);
  fs.writeFileSync(
    path.join(CACHE_DIR, 'free-zones.meta.json'), 
    JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'free-zones',
      size: freeZonesData.length
    }, null, 2)
  );
  
  // Create establishing companies test cache
  const establishingData = `
  <html>
    <head><title>Establishing Companies Test</title></head>
    <body>
      <div class="main-content">
        <h1>Establishing Companies in UAE</h1>
        <p>${ESTABLISHING_UNIQUE_TEXT}</p>
        
        <div class="guide">
          <h3 class="guide-title">Test Company Type</h3>
          <p class="guide-content">This is a test company type.</p>
        </div>
      </div>
    </body>
  </html>
  `;
  
  fs.writeFileSync(path.join(CACHE_DIR, 'establishing-companies.html'), establishingData);
  fs.writeFileSync(
    path.join(CACHE_DIR, 'establishing-companies.meta.json'), 
    JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'establishing-companies',
      size: establishingData.length
    }, null, 2)
  );
  
  console.log("✅ Cache files created with unique identifiers");
}

/**
 * Create a small test script that imports and runs our scraper
 */
function createScraperTestScript() {
  const tempScriptPath = path.join(process.cwd(), 'temp-scraper-verification.js');
  
  // Simple script that runs the scraper and exits
  const scriptContent = `
  import { db } from './server/db.ts';
  import { freeZones } from './shared/schema.ts';
  import { sql } from 'drizzle-orm';
  
  // This script checks if our unique identifiers made it to the database
  async function verifyScraperCache() {
    console.log("Checking database for unique cache identifiers...");
    
    const uniqueId = "${TEST_UNIQUE_ID}";
    console.log("Looking for unique ID:", uniqueId);
    
    try {
      // Query the database for our unique identifier
      const uniqueZones = await db
        .select()
        .from(freeZones)
        .where(sql\`\${freeZones.description} LIKE ${'%' + uniqueId + '%'}\`);
      
      if (uniqueZones.length > 0) {
        console.log("✅ SUCCESS! Found unique identifier in database:");
        console.log(uniqueZones);
        return true;
      } else {
        console.log("❌ Did not find unique identifier in database");
        
        // Check if any free zones exist at all
        const allZones = await db.select().from(freeZones);
        console.log(\`Found \${allZones.length} free zones in database\`);
        return false;
      }
    } catch (err) {
      console.error("Error querying database:", err);
      return false;
    }
  }
  
  verifyScraperCache().catch(console.error).finally(() => {
    // Disconnect from the database
    db.disconnect?.();
    process.exit(0);
  });
  `;
  
  fs.writeFileSync(tempScriptPath, scriptContent);
  return tempScriptPath;
}

/**
 * Main test function
 */
async function testCacheVerification() {
  console.log("🔍 Testing if scraper uses cache instead of mock data");
  
  try {
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    
    // Create cache files with unique identifiers
    createTestCacheFiles();
    
    // Trigger a server restart to force the scraper to run again
    console.log("\n📝 Restarting server to trigger scraper run");
    try {
      execSync('touch server/index.ts', { encoding: 'utf-8' });
      console.log("✅ Server restart triggered");
    } catch (err) {
      console.error(`❌ Error triggering server restart: ${err.message}`);
    }
    
    // Wait for the server to restart and scraper to run
    console.log("\n⏳ Waiting 5 seconds for scraper to run...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Create and run verification script
    console.log("\n📝 Verifying database contains our unique identifiers");
    const scriptPath = createScraperTestScript();
    
    try {
      const result = execSync(`tsx ${scriptPath}`, { encoding: 'utf-8' });
      console.log(result);
    } catch (err) {
      console.error(`❌ Error during verification: ${err.message}`);
    } finally {
      // Clean up
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    }
    
    console.log("\n🏁 Cache verification test completed");
  } catch (err) {
    console.error(`❌ Test failed: ${err.message}`);
  }
}

// Run the test
testCacheVerification().catch(console.error);