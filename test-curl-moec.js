/**
 * Test script that uses the curl approach to connect to MOEC website
 */

import { execSync } from "child_process";

// URL to test
const TEST_URL = 'https://www.moec.gov.ae/en/free-zones';

function execCurlRequest(url) {
  try {
    console.log(`Attempting curl request to ${url}`);
    // Execute curl with options to ignore SSL errors, use a specific user agent, and force older TLS versions
    const result = execSync(
      `curl -k -L --insecure --max-time 60 --tlsv1.1 --tls-max 1.1 -A "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)" "${url}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    console.log(`Successfully fetched ${url} with curl`);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Curl request failed: ${errorMessage}`);
    return null;
  }
}

async function testMoecConnection() {
  console.log('Starting MOEC connection test with curl...');
  
  try {
    const response = execCurlRequest(TEST_URL);
    
    if (response) {
      // Show sample of content
      const contentPreview = response.substring(0, 500) + '...';
      console.log('\nResponse content sample:');
      console.log(contentPreview);
      
      console.log('\nTest completed successfully!');
      return true;
    } else {
      console.error('\nFailed to fetch content with curl');
      return false;
    }
  } catch (error) {
    console.error('\nTest failed with error:');
    console.error(error);
    return false;
  }
}

// Run the test
testMoecConnection().then(success => {
  console.log(`Connection test ${success ? 'succeeded' : 'failed'}`);
});