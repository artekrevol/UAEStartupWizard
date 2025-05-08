/**
 * Test script to connect to MOEC website using environment variables to enable legacy renegotiation
 */

import https from 'https';

// URL to test
const TEST_URL = 'https://www.moec.gov.ae/en/free-zones';

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to fetch ${url}`);
    
    const options = {
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1)',
        'Accept': '*/*',
        'Connection': 'close'
      }
    };
    
    const req = https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Successfully received HTTPS response from ${url} (status: ${res.statusCode})`);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error in HTTPS request: ${error.message}`);
      reject(error);
    });
    
    req.on('timeout', () => {
      console.log(`HTTPS request timed out`);
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.setTimeout(30000);
    req.end();
  });
}

async function testMoecConnection() {
  console.log('Starting MOEC connection test with NODE_OPTIONS environment variable...');
  console.log(`Current NODE_OPTIONS: ${process.env.NODE_OPTIONS || 'not set'}`);
  
  try {
    const response = await fetchPage(TEST_URL);
    
    // Check response
    console.log(`\nResponse received with status code: ${response.statusCode}`);
    console.log(`Content-Type: ${response.headers['content-type']}`);
    console.log(`Response size: ${response.data.length} bytes`);
    
    // Show sample of content
    const contentPreview = response.data.substring(0, 500) + '...';
    console.log('\nResponse content sample:');
    console.log(contentPreview);
    
    console.log('\nTest completed successfully!');
    return true;
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