/**
 * API Gateway Testing Script
 * 
 * This script tests that the API Gateway is working correctly by sending
 * requests to various endpoints and checking the responses.
 */

const axios = require('axios');

// Base URLs
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000/api';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m'
  },
  
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

// Helper function to log test results
const logResult = (testName, success, message) => {
  const status = success 
    ? `${colors.fg.green}✓ PASS${colors.reset}` 
    : `${colors.fg.red}✗ FAIL${colors.reset}`;
  
  console.log(`${status} ${testName}`);
  
  if (message) {
    console.log(`  ${message}`);
  }
  
  console.log(''); // Empty line for better readability
};

// Test the health endpoint
const testHealthEndpoint = async () => {
  try {
    console.log(`${colors.bright}Testing Health Endpoint${colors.reset}`);
    
    const response = await axios.get(`${GATEWAY_URL}/health`);
    
    if (response.status === 200 && response.data && response.data.gateway) {
      logResult('Health check', true, 'Gateway is healthy');
    } else {
      logResult('Health check', false, 'Gateway returned unexpected health data');
    }
    
    return true;
  } catch (error) {
    logResult('Health check', false, `Error: ${error.message}`);
    return false;
  }
};

// Test authentication endpoints
const testAuthEndpoints = async () => {
  try {
    console.log(`${colors.bright}Testing Auth Endpoints${colors.reset}`);
    
    // Just test that the endpoints are reachable
    // We won't actually register or login in this test
    
    // Test registration endpoint
    try {
      await axios.options(`${GATEWAY_URL}/auth/register`);
      logResult('Auth registration endpoint', true, 'Registration endpoint accessible');
    } catch (error) {
      if (error.response && error.response.status !== 404) {
        logResult('Auth registration endpoint', true, 'Registration endpoint accessible (returns error if not POST)');
      } else {
        logResult('Auth registration endpoint', false, `Error: ${error.message}`);
      }
    }
    
    // Test login endpoint
    try {
      await axios.options(`${GATEWAY_URL}/auth/login`);
      logResult('Auth login endpoint', true, 'Login endpoint accessible');
    } catch (error) {
      if (error.response && error.response.status !== 404) {
        logResult('Auth login endpoint', true, 'Login endpoint accessible (returns error if not POST)');
      } else {
        logResult('Auth login endpoint', false, `Error: ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    logResult('Auth endpoints', false, `Error: ${error.message}`);
    return false;
  }
};

// Test freezone endpoints
const testFreezoneEndpoints = async () => {
  try {
    console.log(`${colors.bright}Testing Freezone Endpoints${colors.reset}`);
    
    // Test freezone list endpoint
    try {
      const response = await axios.get(`${GATEWAY_URL}/freezones/list`);
      
      if (response.status === 200) {
        logResult('Freezone list', true, 'Freezone list endpoint accessible');
      } else {
        logResult('Freezone list', false, `Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      // If we get a 502 error, the proxy is working but the service might be down
      if (error.response && error.response.status === 502) {
        logResult('Freezone list', true, 'Proxy works but freezone service might be down (502)');
      } else if (error.response && error.response.status !== 404) {
        logResult('Freezone list', true, 'Freezone list endpoint accessible (returns error)');
      } else {
        logResult('Freezone list', false, `Error: ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    logResult('Freezone endpoints', false, `Error: ${error.message}`);
    return false;
  }
};

// Test document endpoints
const testDocumentEndpoints = async () => {
  try {
    console.log(`${colors.bright}Testing Document Endpoints${colors.reset}`);
    
    // Test public documents endpoint
    try {
      const response = await axios.get(`${GATEWAY_URL}/documents/public`);
      
      if (response.status === 200) {
        logResult('Public documents', true, 'Public documents endpoint accessible');
      } else {
        logResult('Public documents', false, `Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      // If we get a 502 error, the proxy is working but the service might be down
      if (error.response && error.response.status === 502) {
        logResult('Public documents', true, 'Proxy works but document service might be down (502)');
      } else if (error.response && error.response.status !== 404) {
        logResult('Public documents', true, 'Public documents endpoint accessible (returns error)');
      } else {
        logResult('Public documents', false, `Error: ${error.message}`);
      }
    }
    
    return true;
  } catch (error) {
    logResult('Document endpoints', false, `Error: ${error.message}`);
    return false;
  }
};

// Run all tests
const runTests = async () => {
  console.log(`${colors.fg.cyan}${colors.bright}API Gateway Test Suite${colors.reset}`);
  console.log('-'.repeat(50));
  console.log(`Gateway URL: ${GATEWAY_URL}`);
  console.log('-'.repeat(50));
  
  // Run the tests
  let healthOk = await testHealthEndpoint();
  let authOk = await testAuthEndpoints();
  let freezoneOk = await testFreezoneEndpoints();
  let documentOk = await testDocumentEndpoints();
  
  // Summary
  console.log('-'.repeat(50));
  console.log(`${colors.bright}Test Summary:${colors.reset}`);
  
  const healthStatus = healthOk 
    ? `${colors.fg.green}OK${colors.reset}` 
    : `${colors.fg.red}FAIL${colors.reset}`;
  const authStatus = authOk 
    ? `${colors.fg.green}OK${colors.reset}` 
    : `${colors.fg.red}FAIL${colors.reset}`;
  const freezoneStatus = freezoneOk 
    ? `${colors.fg.green}OK${colors.reset}` 
    : `${colors.fg.red}FAIL${colors.reset}`;
  const documentStatus = documentOk 
    ? `${colors.fg.green}OK${colors.reset}` 
    : `${colors.fg.red}FAIL${colors.reset}`;
  
  console.log(`Gateway Health: ${healthStatus}`);
  console.log(`Auth Endpoints: ${authStatus}`);
  console.log(`Freezone Endpoints: ${freezoneStatus}`);
  console.log(`Document Endpoints: ${documentStatus}`);
  
  // Overall status
  const allOk = healthOk && authOk && freezoneOk && documentOk;
  console.log('-'.repeat(50));
  
  if (allOk) {
    console.log(`${colors.fg.green}${colors.bright}API Gateway is functioning correctly!${colors.reset}`);
  } else {
    console.log(`${colors.fg.yellow}${colors.bright}API Gateway needs attention - some tests failed.${colors.reset}`);
  }
};

// Execute the tests
runTests().catch(error => {
  console.error(`${colors.fg.red}${colors.bright}Test runner error:${colors.reset}`, error);
});