/**
 * Test script for the Premium Agent with UAE Freezone expertise
 * 
 * This script tests the enhanced business assistant's functionality
 * by first initializing the memory with UAE free zone knowledge
 * and then testing the chat functionality with business setup questions.
 */

import axios from 'axios';

// Base URL for API calls (update if deployed to a different URL)
const API_BASE_URL = 'http://localhost:5000/api';

// Test the initialization endpoint
async function testMemoryInitialization() {
  console.log('\n🧠 Testing premium agent memory initialization...');
  
  try {
    const response = await axios.post(`${API_BASE_URL}/enhanced-business-assistant/initialize`);
    
    if (response.data.status === 'success') {
      console.log('✅ Memory initialization successful!');
      console.log(`Response: ${response.data.message}`);
    } else {
      console.error('❌ Memory initialization failed!');
      console.error(`Error: ${response.data.error || 'Unknown error'}`);
    }
    
    return response.data.status === 'success';
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

// Test the chat endpoint with a business setup question
async function testEnhancedChat(question) {
  console.log(`\n💬 Testing premium agent chat with question: "${question}"`);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/enhanced-business-assistant/chat`, {
      message: question
    });
    
    console.log('✅ Chat response received!');
    console.log('🤖 Assistant Response:');
    console.log(response.data.message);
    
    console.log('\n📊 Memory Extraction:');
    console.log(`Key topics: ${response.data.memory.key_topics.join(', ')}`);
    console.log(`Next steps: ${response.data.memory.next_steps.join(', ')}`);
    
    const businessInfo = response.data.memory.business_setup_info;
    if (Object.keys(businessInfo).length > 0) {
      console.log('\n📋 Business Setup Information Extracted:');
      for (const [key, value] of Object.entries(businessInfo)) {
        if (value && value !== 'null') {
          console.log(`- ${key.replace(/_/g, ' ')}: ${value}`);
        }
      }
    }
    
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
  // Test 1: Initialize memory
  const initSuccess = await testMemoryInitialization();
  
  if (!initSuccess) {
    console.error('Memory initialization failed! Skipping chat tests.');
    return;
  }
  
  // Test 2: Ask about DMCC free zone
  await testEnhancedChat('What licenses can I get in DMCC free zone?');
  
  // Test 3: Ask about SAIF Zone
  await testEnhancedChat('Tell me about setting up a business in SAIF Zone. What are the requirements?');
  
  // Test 4: Ask about business activities
  await testEnhancedChat('What business activities can I do in UAE free zones?');
  
  console.log('\n🎉 All tests completed!');
}

// Run the tests
runTests().catch(error => {
  console.error('Test script failed with error:', error);
});