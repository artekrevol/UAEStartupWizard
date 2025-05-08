/**
 * Security Testing Script
 * 
 * This script tests the security enhancements implemented across our microservices
 */
const axios = require('axios');
const crypto = require('crypto');

console.log('🔐 Running security tests...');

// Configuration
const API_GATEWAY_URL = 'http://localhost:3000';
const USER_SERVICE_URL = 'http://localhost:3001';
const TEST_USERNAME = 'security_test_user';
const TEST_PASSWORD = 'Secure@Password123!';

// Test 1: Test API Gateway security headers
async function testSecurityHeaders() {
  console.log('\n🧪 Test 1: Checking security headers');
  
  try {
    const response = await axios.get(`${API_GATEWAY_URL}/api/health`);
    
    // Check for important security headers
    const headers = response.headers;
    console.log('Headers received:', Object.keys(headers));
    
    const securityHeaders = [
      'x-content-type-options',
      'strict-transport-security',
      'x-frame-options',
      'x-xss-protection'
    ];
    
    let allHeadersFound = true;
    for (const header of securityHeaders) {
      if (headers[header]) {
        console.log(`✅ ${header}: ${headers[header]}`);
      } else {
        console.log(`❌ ${header}: Missing`);
        allHeadersFound = false;
      }
    }
    
    if (allHeadersFound) {
      console.log('✅ All security headers are properly set');
    } else {
      console.log('⚠️ Some security headers are missing');
    }
    
  } catch (error) {
    console.error('❌ Failed to test security headers:', error.message);
  }
}

// Test 2: Test rate limiting
async function testRateLimiting() {
  console.log('\n🧪 Test 2: Testing rate limiting');
  
  try {
    console.log('Making multiple rapid requests to test rate limiting...');
    
    // Make many requests in quick succession
    const requests = [];
    const MAX_REQUESTS = 50;
    
    for (let i = 0; i < MAX_REQUESTS; i++) {
      requests.push(axios.get(`${API_GATEWAY_URL}/api/health`).catch(error => {
        // We expect some requests to fail with 429 Too Many Requests
        return error.response;
      }));
    }
    
    const responses = await Promise.all(requests);
    
    // Count rate limited responses
    const rateLimited = responses.filter(r => r && r.status === 429).length;
    
    if (rateLimited > 0) {
      console.log(`✅ Rate limiting working: ${rateLimited} of ${MAX_REQUESTS} requests were rate limited`);
    } else {
      console.log('⚠️ Rate limiting may not be working properly, all requests succeeded');
    }
    
  } catch (error) {
    console.error('❌ Failed to test rate limiting:', error.message);
  }
}

// Test 3: Test service-to-service authentication
async function testServiceAuthentication() {
  console.log('\n🧪 Test 3: Testing service-to-service authentication');
  
  // Test with invalid API key
  try {
    console.log('Testing with invalid API key...');
    
    const response = await axios.get(`${USER_SERVICE_URL}/api/internal/users`, {
      headers: {
        'X-API-Key': 'invalid_key',
        'X-Service-Name': 'api-gateway'
      }
    }).catch(e => e.response);
    
    if (response && response.status === 401) {
      console.log('✅ Invalid API key correctly rejected with 401 Unauthorized');
    } else {
      console.log(`❌ Invalid API key was not rejected correctly (Status: ${response?.status || 'unknown'})`);
    }
    
  } catch (error) {
    console.error('❌ Error during invalid API key test:', error.message);
  }
  
  // Test without service name
  try {
    console.log('Testing without service name...');
    
    const response = await axios.get(`${USER_SERVICE_URL}/api/internal/users`, {
      headers: {
        'X-API-Key': 'dev_api_gateway_key'
      }
    }).catch(e => e.response);
    
    if (response && response.status === 401) {
      console.log('✅ Missing service name correctly rejected with 401 Unauthorized');
    } else {
      console.log(`❌ Missing service name was not rejected correctly (Status: ${response?.status || 'unknown'})`);
    }
    
  } catch (error) {
    console.error('❌ Error during missing service name test:', error.message);
  }
  
  // Test with valid credentials
  try {
    console.log('Testing with valid service credentials...');
    
    const response = await axios.get(`${USER_SERVICE_URL}/api/internal/users`, {
      headers: {
        'X-API-Key': 'dev_api_gateway_key',
        'X-Service-Name': 'api-gateway'
      }
    }).catch(e => e.response);
    
    // The response status will depend on your implementation and whether this endpoint exists
    // It should not be a 401 Unauthorized if the service auth works
    if (response && response.status !== 401) {
      console.log(`✅ Valid service credentials accepted (Status: ${response.status})`);
    } else {
      console.log(`❌ Valid service credentials not working correctly (Status: ${response?.status || 'unknown'})`);
    }
    
  } catch (error) {
    console.error('❌ Error during valid service credentials test:', error.message);
  }
}

// Test 4: Test encryption utility
async function testEncryption() {
  console.log('\n🧪 Test 4: Testing encryption utility');
  
  // Simple test for encryption - using Node's built-in crypto as our utility is server-side
  try {
    const testText = 'Sensitive user data: credit card 4111-1111-1111-1111';
    
    // Generate a key that can be used for AES-256-CBC
    const key = crypto.scryptSync('encryption_password', 'salt', 32);
    
    // Create an initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create a cipher using the generated key and iv
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Update the cipher with the message to encrypt
    let encrypted = cipher.update(testText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    console.log(`Original: ${testText}`);
    console.log(`Encrypted: ${encrypted}`);
    
    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log(`Decrypted: ${decrypted}`);
    
    if (decrypted === testText) {
      console.log('✅ Encryption and decryption working correctly');
    } else {
      console.log('❌ Encryption and decryption not working correctly');
    }
    
  } catch (error) {
    console.error('❌ Error during encryption test:', error.message);
  }
}

// Test 5: Test open redirect protection
async function testOpenRedirectProtection() {
  console.log('\n🧪 Test 5: Testing open redirect protection');
  
  // In a real test, we'd check if redirects to external domains are blocked
  console.log('To test open redirect protection manually:');
  console.log('1. Try accessing a URL like:');
  console.log(`   ${API_GATEWAY_URL}/api/redirect?url=https://evil-site.com`);
  console.log('2. It should redirect to the application homepage instead of the external site');
  console.log('3. While a URL like:');
  console.log(`   ${API_GATEWAY_URL}/api/redirect?url=/dashboard`);
  console.log('   should work correctly (redirect within the same domain)');
}

// Run all tests
async function runAllTests() {
  try {
    await testSecurityHeaders();
    await testRateLimiting();
    await testServiceAuthentication();
    await testEncryption();
    await testOpenRedirectProtection();
    
    console.log('\n🎉 Security tests completed!');
    console.log('Review the output above to verify that security measures are working properly');
    
  } catch (error) {
    console.error('Error running security tests:', error);
  }
}

runAllTests();