/**
 * Test Script for Scraper Microservice
 * 
 * This script tests the functionality of the Scraper microservice by sending
 * requests to its endpoints through the API Gateway.
 */

import axios from 'axios';

// Configuration
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:3004';
const AUTH_TOKEN = process.env.AUTH_TOKEN; // Admin auth token if available

// Log API Gateway health status
const testApiGatewayHealth = async () => {
  try {
    console.log('\n[TEST] Checking API Gateway health...');
    const response = await axios.get(`${API_GATEWAY_URL}/api/health`);
    console.log('[RESULT] API Gateway health check:', response.status === 200 ? 'SUCCESS' : 'FAIL');
    console.log(`[INFO] Services registered:`, 
      Object.keys(response.data.services || {}).join(', ') || 'None');
    return true;
  } catch (error) {
    console.error('[ERROR] API Gateway health check failed:', error.message);
    return false;
  }
};

// Test Scraper Service health status directly
const testScraperServiceHealth = async () => {
  try {
    console.log('\n[TEST] Checking Scraper Service health directly...');
    const response = await axios.get(`${SCRAPER_SERVICE_URL}/health`);
    console.log('[RESULT] Scraper Service health check:', response.status === 200 ? 'SUCCESS' : 'FAIL');
    console.log('[INFO] Service status:', response.data.status);
    return true;
  } catch (error) {
    console.error('[ERROR] Scraper Service health check failed:', error.message);
    return false;
  }
};

// Test Scraper Service status through API Gateway
const testScraperStatusEndpoint = async () => {
  try {
    console.log('\n[TEST] Testing scraper status endpoint through API Gateway...');
    
    const headers = AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {};
    
    const response = await axios.get(
      `${API_GATEWAY_URL}/api/scraper/status`, 
      { headers }
    );
    
    console.log('[RESULT] Scraper status endpoint:', response.status === 200 ? 'SUCCESS' : 'FAIL');
    console.log('[INFO] Scraper status:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('[ERROR] Authentication required. Set AUTH_TOKEN in the environment.');
    } else {
      console.error('[ERROR] Scraper status endpoint failed:', error.message);
    }
    return false;
  }
};

// Test scraping free zones
const testScrapeFreeZones = async () => {
  try {
    console.log('\n[TEST] Testing free zones scraping...');
    
    if (!AUTH_TOKEN) {
      console.error('[ERROR] Authentication required. Set AUTH_TOKEN in the environment.');
      return false;
    }
    
    const response = await axios.post(
      `${API_GATEWAY_URL}/api/scraper/free-zones`,
      {},
      { 
        headers: { 
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    console.log('[RESULT] Free zones scraping:', response.status === 200 ? 'SUCCESS' : 'FAIL');
    console.log('[INFO] Scraped', response.data.data?.count, 'free zones');
    return true;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('[ERROR] Authentication required or token is invalid/expired.');
    } else if (error.response && error.response.status === 403) {
      console.error('[ERROR] Access denied. Admin rights required.');
    } else {
      console.error('[ERROR] Free zones scraping failed:', error.message);
    }
    return false;
  }
};

// Test scraping establishment guides
const testScrapeEstablishmentGuides = async () => {
  try {
    console.log('\n[TEST] Testing establishment guides scraping...');
    
    if (!AUTH_TOKEN) {
      console.error('[ERROR] Authentication required. Set AUTH_TOKEN in the environment.');
      return false;
    }
    
    const response = await axios.post(
      `${API_GATEWAY_URL}/api/scraper/establishment-guides`,
      {},
      { 
        headers: { 
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    console.log('[RESULT] Establishment guides scraping:', response.status === 200 ? 'SUCCESS' : 'FAIL');
    console.log('[INFO] Scraped', response.data.data?.count, 'establishment guides');
    return true;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('[ERROR] Authentication required or token is invalid/expired.');
    } else if (error.response && error.response.status === 403) {
      console.error('[ERROR] Access denied. Admin rights required.');
    } else {
      console.error('[ERROR] Establishment guides scraping failed:', error.message);
    }
    return false;
  }
};

// Test scheduling a scraping job
const testScheduleScrapingJob = async () => {
  try {
    console.log('\n[TEST] Testing scheduling a scraping job...');
    
    if (!AUTH_TOKEN) {
      console.error('[ERROR] Authentication required. Set AUTH_TOKEN in the environment.');
      return false;
    }
    
    const response = await axios.post(
      `${API_GATEWAY_URL}/api/scraper/schedule`,
      {
        schedule: '0 0 * * *', // Daily at midnight
        type: 'all'
      },
      { 
        headers: { 
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        } 
      }
    );
    
    console.log('[RESULT] Schedule scraping job:', response.status === 200 ? 'SUCCESS' : 'FAIL');
    console.log('[INFO] Response:', response.data.message);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.error('[ERROR] Authentication required or token is invalid/expired.');
    } else if (error.response && error.response.status === 403) {
      console.error('[ERROR] Access denied. Admin rights required.');
    } else {
      console.error('[ERROR] Scheduling scraping job failed:', error.message);
    }
    return false;
  }
};

// Run all tests
const runTests = async () => {
  console.log('======== SCRAPER MICROSERVICE TEST SCRIPT ========');
  console.log('API Gateway URL:', API_GATEWAY_URL);
  console.log('Scraper Service URL:', SCRAPER_SERVICE_URL);
  console.log('Auth Token:', AUTH_TOKEN ? 'Provided' : 'Not provided');
  console.log('================================================\n');
  
  // Health checks
  const apiGatewayHealthy = await testApiGatewayHealth();
  const scraperServiceHealthy = await testScraperServiceHealth();
  
  if (!apiGatewayHealthy) {
    console.error('\n[CRITICAL] API Gateway is not responding. Tests cannot continue.');
    return;
  }
  
  if (!scraperServiceHealthy) {
    console.error('\n[CRITICAL] Scraper Service is not responding directly. Tests may fail.');
  }
  
  // Status check through API Gateway
  await testScraperStatusEndpoint();
  
  // If we have an auth token, test the admin-only endpoints
  if (AUTH_TOKEN) {
    await testScrapeFreeZones();
    await testScrapeEstablishmentGuides();
    await testScheduleScrapingJob();
  } else {
    console.warn('\n[WARNING] Skipping admin-only endpoints due to missing AUTH_TOKEN');
  }
  
  console.log('\n======== TEST SUMMARY ========');
  console.log('API Gateway Health:', apiGatewayHealthy ? 'ONLINE' : 'OFFLINE');
  console.log('Scraper Service Health:', scraperServiceHealthy ? 'ONLINE' : 'OFFLINE');
  console.log('==============================\n');
  
  console.log('To test admin-only endpoints, set the AUTH_TOKEN environment variable:');
  console.log('Example: AUTH_TOKEN=<your_admin_token> node test-scraper-service.js');
};

// Execute tests
runTests().catch(error => {
  console.error('Test script error:', error);
});