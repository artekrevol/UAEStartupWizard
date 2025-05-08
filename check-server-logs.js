/**
 * Script to trigger the scraper and check if it's using our custom cache data
 * This script:
 * 1. Restarts the server to trigger the scraper
 * 2. Monitors the logs to see if our unique identifier is being used
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Cache directory
const CACHE_DIR = path.join(process.cwd(), 'cache');

// Create a very obvious unique identifier
const UNIQUE_ID = `CACHE-TEST-${Date.now()}`;

// Create custom cache files with our unique identifier
function createCustomCache() {
  console.log(`Creating cache files with unique identifier: ${UNIQUE_ID}`);
  
  // Free Zones cache
  const freeZonesHtml = `
  <html>
    <head><title>FREE ZONES TEST CACHE</title></head>
    <body>
      <div class="main-content">
        <h1>UAE Free Zones UNIQUE TEST DATA ${UNIQUE_ID}</h1>
        <p>This is a completely unique cache entry with identifier: ${UNIQUE_ID}</p>
        
        <div class="card free-zone-card">
          <h3 class="title">TEST ZONE ${UNIQUE_ID}</h3>
          <p class="description">This is a test zone with unique content.</p>
          <div class="location">Test Location</div>
          <ul class="benefits">
            <li>Test Benefit 1</li>
            <li>Test Benefit 2</li>
          </ul>
        </div>
      </div>
    </body>
  </html>
  `;
  
  fs.writeFileSync(path.join(CACHE_DIR, 'free-zones.html'), freeZonesHtml);
  fs.writeFileSync(
    path.join(CACHE_DIR, 'free-zones.meta.json'), 
    JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'free-zones',
      size: freeZonesHtml.length
    }, null, 2)
  );
  
  console.log("Cache files created successfully");
}

// Trigger server restart
function triggerServerRestart() {
  try {
    console.log("Triggering server restart...");
    execSync('touch server/index.ts', { encoding: 'utf-8' });
    console.log("Server restart triggered");
    return true;
  } catch (err) {
    console.error(`Error triggering server restart: ${err.message}`);
    return false;
  }
}

// Check server logs for our unique identifier
function checkServerLogs() {
  try {
    console.log(`\nChecking server logs for unique identifier: ${UNIQUE_ID}`);
    console.log("Waiting 10 seconds for logs to appear...");
    
    // Wait a few seconds for logs to appear
    execSync('sleep 10');
    
    // Get recent logs
    const logs = execSync('journalctl -u replit-rtd -n 100', { encoding: 'utf-8' });
    
    // Check if our unique identifier appears in the logs
    if (logs.includes(UNIQUE_ID)) {
      console.log("✅ SUCCESS! Found our unique identifier in the logs");
      console.log("This confirms the cache is being used correctly.");
      
      // Extract the specific log line
      const lines = logs.split('\n');
      const matchingLines = lines.filter(line => line.includes(UNIQUE_ID));
      console.log("\nMatching log entries:");
      matchingLines.forEach(line => console.log(`- ${line}`));
      
      return true;
    } else {
      console.log("❌ Did not find unique identifier in logs");
      console.log("Cache might not be working correctly.");
      return false;
    }
  } catch (err) {
    console.error(`Error checking logs: ${err.message}`);
    return false;
  }
}

// Check database for our unique identifier
function checkDatabase() {
  const scriptPath = path.join(process.cwd(), 'check-database.js');
  
  try {
    console.log("\nChecking database for our unique identifier...");
    
    // Write a script to check the database
    const scriptContent = `
    import { db } from './server/db.ts';
    import { freeZones } from './shared/schema.ts';
    
    async function checkDatabase() {
      console.log("Looking for unique identifier in database: ${UNIQUE_ID}");
      
      try {
        // Get all free zones
        const allZones = await db.select().from(freeZones);
        console.log(\`Found \${allZones.length} free zones in database\`);
        
        // Check each one for our identifier
        const matchingZones = allZones.filter(zone => 
          zone.name?.includes("${UNIQUE_ID}") || 
          zone.description?.includes("${UNIQUE_ID}")
        );
        
        if (matchingZones.length > 0) {
          console.log("✅ Found matching free zones in database:");
          console.log(matchingZones);
          return true;
        } else {
          console.log("❌ No matching free zones found in database");
          
          // List a few zones as reference
          if (allZones.length > 0) {
            console.log("Sample zone names from database:");
            allZones.slice(0, 3).forEach(zone => console.log(\`- \${zone.name}\`));
          }
          
          return false;
        }
      } catch (err) {
        console.error("Error querying database:", err);
        return false;
      } finally {
        // Disconnect from database
        db.disconnect?.();
      }
    }
    
    checkDatabase().catch(console.error).finally(() => {
      process.exit(0);
    });
    `;
    
    fs.writeFileSync(scriptPath, scriptContent);
    
    // Run the script
    const result = execSync(`tsx ${scriptPath}`, { encoding: 'utf-8' });
    console.log(result);
    
    // Clean up
    fs.unlinkSync(scriptPath);
    
    return result.includes("Found matching free zones");
  } catch (err) {
    console.error(`Error checking database: ${err.message}`);
    return false;
  }
}

// Run the main test
async function runTest() {
  console.log("🔍 Testing if scraper is using our cache data\n");
  
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  
  // Create custom cache files
  createCustomCache();
  
  // Trigger server restart
  if (!triggerServerRestart()) {
    console.error("Could not trigger server restart. Test failed.");
    return;
  }
  
  // Check database
  const databaseResult = checkDatabase();
  
  console.log("\n🏁 Test completed");
  console.log(`Overall result: ${databaseResult ? "✅ SUCCESS" : "❌ FAILED"}`);
}

// Run the test
runTest().catch(console.error);