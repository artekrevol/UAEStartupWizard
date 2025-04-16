/**
 * Test script for the Premium Agent with UAE Freezone expertise
 * 
 * This script tests the enhanced business assistant's functionality
 * by first confirming the system knowledge is initialized
 * and then sending a test question to the assistant.
 */

import axios from 'axios';

// Base URL for API calls
const API_BASE_URL = 'http://localhost:5000/api';

// Test the initialization endpoint
async function testMemoryInitialization() {
  console.log('\n🧠 Testing premium agent memory initialization...');
  
  try {
    console.log('Sending request to /enhanced-business-assistant/initialize endpoint...');
    const response = await axios.post(`${API_BASE_URL}/enhanced-business-assistant/initialize`);
    
    console.log('✅ Response received:');
    console.log(response.data);
    
    return true;
  } catch (error) {
    console.error('❌ Memory initialization request failed!');
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Test the enhanced chat endpoint
async function testEnhancedChat() {
  console.log('\n💬 Testing premium agent chat functionality...');
  
  try {
    console.log('Sending test question to /enhanced-business-assistant/chat endpoint...');
    const response = await axios.post(`${API_BASE_URL}/enhanced-business-assistant/chat`, {
      message: "What are the requirements for setting up a business in DMCC free zone?"
    });
    
    console.log('✅ Chat response received!');
    console.log('\n🤖 Assistant Response:');
    console.log('--------------------------------');
    console.log(response.data.message);
    console.log('--------------------------------');
    
    return true;
  } catch (error) {
    console.error('❌ Chat request failed!');
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// Run the test sequence
async function runTests() {
  // Step 1: Confirm system knowledge is initialized
  const initSuccess = await testMemoryInitialization();
  
  if (!initSuccess) {
    console.error('Memory initialization validation failed! Skipping chat test.');
    return;
  }
  
  // Step 2: Test enhanced chat functionality
  const chatSuccess = await testEnhancedChat();
  
  if (chatSuccess) {
    console.log('\n🎉 All tests completed successfully!');
  } else {
    console.error('\n❌ Chat test failed!');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test script failed with unexpected error:', error);
});