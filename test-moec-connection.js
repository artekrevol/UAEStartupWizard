/**
 * Script to test the direct HTTPS connection to MOEC website
 * with enhanced SSL connection handling
 */

import https from 'https';
import { constants } from 'crypto';

// URL to test
const TEST_URL = 'https://www.moec.gov.ae/en/free-zones';

// Direct HTTPS request with enhanced SSL handling
function makeDirectHttpsRequest(url) {
  return new Promise((resolve, reject) => {
    console.log(`Making direct HTTPS request to ${url}`);
    
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
      console.log(`Configuring HTTPS request with custom options`);
      
      const req = https.request(options, (res) => {
        let data = '';
        
        // Handle redirects manually
        if (res.statusCode && (res.statusCode >= 300 && res.statusCode < 400)) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            console.log(`Following redirect to ${redirectUrl}`);
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
          console.log(`Successfully received direct HTTPS response from ${url} (status: ${res.statusCode})`);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        console.log(`Error in direct HTTPS request: ${error.message}`);
        reject(error);
      });
      
      req.on('timeout', () => {
        console.log(`Direct HTTPS request timed out`);
        req.destroy();
        reject(new Error('Request timed out'));
      });
      
      // Apply a long timeout (2 minutes)
      req.setTimeout(120000);
      req.end();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.log(`Exception setting up HTTPS request: ${errorMessage}`);
      reject(err);
    }
  });
}

// Main test function
async function testMoecConnection() {
  console.log('Starting MOEC connection test...');
  
  try {
    // Test direct HTTPS request
    console.log('\nTesting direct HTTPS request...');
    const response = await makeDirectHttpsRequest(TEST_URL);
    
    // Check response
    console.log(`Response received with status code: ${response.statusCode}`);
    console.log(`Content-Type: ${response.headers['content-type']}`);
    console.log(`Response size: ${response.data.length} bytes`);
    
    // Show sample of content
    const contentPreview = response.data.substring(0, 500) + '...';
    console.log('\nResponse content sample:');
    console.log(contentPreview);
    
    console.log('\nTest completed successfully - connection works!');
  } catch (error) {
    console.error('\nTest failed with error:');
    console.error(error);
  }
}

// Run the test
testMoecConnection().catch(console.error);