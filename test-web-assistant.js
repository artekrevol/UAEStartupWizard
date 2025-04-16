/**
 * Test script for the Web Research Assistant
 * 
 * This script tests the direct functions of the Web Research Assistant
 * without going through the full assistant pipeline.
 */

import { premiumBusinessAnswer } from './server/WebResearchAssistant.js';

/**
 * Test the premium business answer functionality
 */
async function testPremiumBusinessAnswer() {
  console.log('\n🔍 Testing premium business answer functionality...');
  
  try {
    // Test question about DMCC requirements
    const question = 'What are the requirements for setting up a business in DMCC free zone?';
    console.log(`📝 Test question: "${question}"`);
    
    // Call the premium business answer function directly
    console.log('Sending request to premium business answer function...');
    const response = await premiumBusinessAnswer(question);
    
    // Display the response
    console.log('\n✅ Response received:');
    console.log('-----------------------------');
    console.log(`Answer: ${response.answer}`);
    console.log(`Sources: ${response.sources}`);
    console.log(`Source Type: ${response.sourceType}`);
    console.log(`Confidence: ${response.confidence}`);
    console.log('-----------------------------');
    
    return true;
  } catch (error) {
    console.error('\n❌ Error testing premium business answer:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting Web Research Assistant tests...');
  
  // Test premium business answer
  const premiumAnswerSuccess = await testPremiumBusinessAnswer();
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`Premium Business Answer: ${premiumAnswerSuccess ? '✅ Passed' : '❌ Failed'}`);
  
  // Exit with appropriate code
  if (premiumAnswerSuccess) {
    console.log('\n✨ All tests passed successfully!\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check the logs above for details.\n');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});