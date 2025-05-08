/**
 * Test script to validate data caching functionality
 */

import fs from "fs";
import path from "path";

// Cache directory for storing fetched data
const CACHE_DIR = path.join(process.cwd(), 'cache');

// Test data
const testData = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Cache Data</title>
  </head>
  <body>
    <h1>This is test data for cache validation</h1>
    <p>Created at: ${new Date().toISOString()}</p>
  </body>
</html>
`;

/**
 * Save data to cache for future use
 * @param key Unique identifier for the cached data
 * @param data HTML content to cache
 * @returns True if caching was successful
 */
function saveCachedData(key, data) {
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
    
    console.log(`✅ Cached data for ${key} (${data.length} bytes)`);
    return true;
  } catch (err) {
    console.error(`❌ Error caching data for ${key}: ${err.message}`);
    return false;
  }
}

/**
 * Load cached data
 * @param key Unique identifier for the cached data
 * @returns Cached HTML content or null if not found/expired
 */
function loadCachedData(key) {
  try {
    const cachePath = path.join(CACHE_DIR, `${key}.html`);
    const metaPath = path.join(CACHE_DIR, `${key}.meta.json`);
    
    if (!fs.existsSync(cachePath) || !fs.existsSync(metaPath)) {
      console.log(`❌ Cache not found for ${key}`);
      return null;
    }
    
    // Check cache expiration (24 hours)
    const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const cacheTime = new Date(metaData.timestamp).getTime();
    const now = new Date().getTime();
    const cacheDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (now - cacheTime > cacheDuration) {
      console.log(`❌ Cache expired for ${key}`);
      return null;
    }
    
    const data = fs.readFileSync(cachePath, 'utf-8');
    console.log(`✅ Loaded cached data for ${key} (${data.length} bytes, age: ${Math.round((now - cacheTime) / (60 * 1000))} minutes)`);
    return data;
  } catch (err) {
    console.error(`❌ Error loading cached data for ${key}: ${err.message}`);
    return null;
  }
}

// Test functions
async function runCacheTest() {
  console.log("🔍 Starting cache test");

  // Ensure cache directory exists
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      console.log(`✅ Created cache directory at ${CACHE_DIR}`);
    } else {
      console.log(`✅ Cache directory already exists at ${CACHE_DIR}`);
    }
  } catch (err) {
    console.error(`❌ Error creating cache directory: ${err.message}`);
    return;
  }

  const testKey = "test-cache-entry";
  
  // Test 1: Save data to cache
  console.log("\n📝 Test 1: Saving data to cache");
  const saveResult = saveCachedData(testKey, testData);
  
  // Test 2: Load data from cache
  console.log("\n📝 Test 2: Loading data from cache");
  const loadedData = loadCachedData(testKey);
  
  if (loadedData) {
    console.log(`✅ Cache test passed - data loaded successfully`);
    console.log(`✅ Sample of cached data: ${loadedData.substring(0, 100)}...`);
  } else {
    console.log(`❌ Cache test failed - could not load data`);
  }
  
  // Test 3: Verify cache metadata
  console.log("\n📝 Test 3: Verifying cache metadata");
  try {
    const metaPath = path.join(CACHE_DIR, `${testKey}.meta.json`);
    const metaData = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    console.log(`✅ Cache metadata verified:`);
    console.log(metaData);
  } catch (err) {
    console.error(`❌ Error verifying cache metadata: ${err.message}`);
  }
  
  console.log("\n🏁 Cache testing completed");
}

// Run the test
runCacheTest().catch(console.error);