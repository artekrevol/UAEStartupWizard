/**
 * Railway Deployment Health Check Script
 * 
 * This script verifies that your Railway deployment is working correctly by:
 * 1. Checking the health endpoint
 * 2. Testing basic API functionality
 * 3. Verifying database connectivity
 * 
 * Usage:
 *   node verify-railway-deployment.js <deployment-url>
 * 
 * Example:
 *   node verify-railway-deployment.js https://your-app-name.up.railway.app
 */

import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

// Configuration
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

// Get deployment URL from command line argument
const deploymentUrl = process.argv[2]?.trim();

if (!deploymentUrl) {
  console.error('Error: Please provide your Railway deployment URL as an argument');
  console.error('Usage: node verify-railway-deployment.js <deployment-url>');
  process.exit(1);
}

console.log(`Starting verification of deployment at ${deploymentUrl}`);

// Check health endpoint
async function checkHealth(retries = MAX_RETRIES) {
  try {
    console.log(`Checking health endpoint (attempt ${MAX_RETRIES - retries + 1}/${MAX_RETRIES})...`);
    
    const response = await fetch(`${deploymentUrl}/health`);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      console.log('✅ Health check passed!');
      console.log(`Health response: ${JSON.stringify(data)}`);
      return true;
    } else {
      console.error(`Health check failed with status ${response.status}`);
      console.error(`Response: ${JSON.stringify(data)}`);
      
      if (retries > 1) {
        console.log(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
        await setTimeout(RETRY_DELAY_MS);
        return checkHealth(retries - 1);
      }
      return false;
    }
  } catch (error) {
    console.error(`Error checking health: ${error.message}`);
    
    if (retries > 1) {
      console.log(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
      await setTimeout(RETRY_DELAY_MS);
      return checkHealth(retries - 1);
    }
    return false;
  }
}

// Check the API endpoints
async function checkApi() {
  try {
    console.log('Testing API endpoints...');
    
    // Test a public API endpoint (free zones list)
    const response = await fetch(`${deploymentUrl}/api/free-zones`);
    
    if (!response.ok) {
      console.error(`API check failed with status ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    console.log(`API response contains ${data.length || 0} free zones`);
    console.log('✅ API check passed!');
    return true;
  } catch (error) {
    console.error(`Error checking API: ${error.message}`);
    return false;
  }
}

// Check static resources (frontend)
async function checkFrontend() {
  try {
    console.log('Testing frontend static resources...');
    
    // Check if the main page loads
    const response = await fetch(deploymentUrl);
    
    if (!response.ok) {
      console.error(`Frontend check failed with status ${response.status}`);
      return false;
    }
    
    const html = await response.text();
    
    // Check for key indicators that the page loaded correctly
    if (html.includes('<div id="root">') && html.includes('vite.svg')) {
      console.log('✅ Frontend check passed!');
      return true;
    } else {
      console.error('Frontend check failed: Could not find expected HTML markers');
      return false;
    }
  } catch (error) {
    console.error(`Error checking frontend: ${error.message}`);
    return false;
  }
}

// Run all checks
async function runVerification() {
  console.log('=== Railway Deployment Verification ===');
  console.log(`Deployment URL: ${deploymentUrl}`);
  
  let allPassed = true;
  
  // 1. Check health endpoint
  const healthPassed = await checkHealth();
  allPassed = allPassed && healthPassed;
  
  // 2. Check API
  const apiPassed = await checkApi();
  allPassed = allPassed && apiPassed;
  
  // 3. Check frontend
  const frontendPassed = await checkFrontend();
  allPassed = allPassed && frontendPassed;
  
  // Summary
  console.log('\n=== Verification Summary ===');
  console.log(`Health Check: ${healthPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`API Check: ${apiPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Frontend Check: ${frontendPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Overall Status: ${allPassed ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);
  
  if (!allPassed) {
    console.log('\nTroubleshooting tips:');
    console.log('1. Check Railway logs for error messages');
    console.log('2. Verify that DATABASE_URL and JWT_SECRET environment variables are set');
    console.log('3. Run the railway-setup.js script to initialize the database');
    console.log('4. Make sure your database is accessible from Railway');
    process.exit(1);
  } else {
    console.log('\n✅ Your deployment is working correctly!');
    process.exit(0);
  }
}

// Run the verification
runVerification().catch(error => {
  console.error(`Unexpected error during verification: ${error.message}`);
  process.exit(1);
});