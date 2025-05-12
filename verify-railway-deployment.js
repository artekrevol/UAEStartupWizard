/**
 * Railway Deployment Verification Script
 * 
 * This script checks if your Railway deployment is working properly
 * by verifying key functionality, including Playwright-based scraping.
 * 
 * Usage:
 * 1. Deploy your application to Railway
 * 2. Update the DEPLOYMENT_URL below with your Railway URL
 * 3. Run this script: node verify-railway-deployment.js
 */

import { exec } from 'child_process';
import axios from 'axios';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Update this with your Railway deployment URL
const DEPLOYMENT_URL = 'https://your-app-name.up.railway.app';

// Health check endpoint
const HEALTH_ENDPOINT = `${DEPLOYMENT_URL}/health`;

// API endpoints to check
const API_ENDPOINTS = [
  '/api/freezones',
  '/api/activities',
];

async function verifyDeployment() {
  console.log('🚂 Railway Deployment Verification');
  console.log('==================================');

  // Step 1: Check if the deployment is accessible
  try {
    console.log('\n🔍 Checking deployment accessibility...');
    const healthResponse = await axios.get(HEALTH_ENDPOINT);
    
    if (healthResponse.status === 200) {
      console.log('✅ Deployment is accessible!');
    } else {
      console.log('❌ Deployment responded with unexpected status:', healthResponse.status);
      return;
    }
  } catch (error) {
    console.error('❌ Failed to access deployment:', error.message);
    console.log('Please check if your DEPLOYMENT_URL is correct and if the application is running.');
    return;
  }

  // Step 2: Check API endpoints
  console.log('\n🔍 Checking API endpoints...');
  
  for (const endpoint of API_ENDPOINTS) {
    try {
      const response = await axios.get(`${DEPLOYMENT_URL}${endpoint}`);
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
    } catch (error) {
      console.error(`❌ ${endpoint} - Failed: ${error.message}`);
    }
  }

  // Step 3: Check Playwright functionality
  console.log('\n🔍 Checking Playwright scraping capabilities...');
  try {
    const response = await axios.post(`${DEPLOYMENT_URL}/api/admin/trigger-scrape`, {
      type: 'test',
    });
    
    if (response.status === 200 || response.status === 202) {
      console.log('✅ Scraper triggered successfully!');
    } else {
      console.log('❌ Scraper trigger responded with unexpected status:', response.status);
    }
  } catch (error) {
    console.error('❌ Failed to trigger scraper:', error.message);
  }

  console.log('\n==================================');
  console.log('📋 Deployment Verification Summary:');
  console.log('1. Make sure all checks passed with ✅');
  console.log('2. Log into Railway dashboard to check the logs for any errors');
  console.log('3. Verify your application works in the browser');
  console.log('==================================');
}

verifyDeployment().catch(error => {
  console.error('An unexpected error occurred during verification:', error);
});