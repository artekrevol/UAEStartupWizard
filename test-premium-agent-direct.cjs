/**
 * Test script for the Premium Agent Direct Implementation
 * 
 * This script tests the direct functions of the Premium Agent
 * without requiring the full pipeline.
 */

// Set up environment variables
require('dotenv').config();

// Import necessary functions
const { db } = require('./server/db');
const { answerBusinessQuestion, searchDocuments } = require('./server/WebResearchAssistant');

/**
 * Test the premium business answer functionality directly
 */
async function testDirectPremiumAnswer() {
  console.log('\n🔍 Testing direct premium business answer...');
  
  try {
    // Test question about DMCC requirements
    const question = 'What are the requirements for setting up a business in DMCC free zone?';
    console.log(`📝 Test question: "${question}"`);
    
    // First search for documents about DMCC
    console.log('\nSearching for documents about DMCC...');
    const documents = await searchDocuments('DMCC business setup');
    console.log(`Found ${documents.length} documents related to DMCC.`);
    
    // Call the business answer function directly
    console.log('\nGenerating expert answer for the question...');
    const answer = await answerBusinessQuestion(question);
    
    // Display the answer
    console.log('\n✅ Answer received:');
    console.log('-----------------------------');
    console.log(answer);
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
  console.log('🧪 Starting Premium Agent Direct Tests...');
  
  // Test premium business answer
  const premiumAnswerSuccess = await testDirectPremiumAnswer();
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`Direct Premium Answer: ${premiumAnswerSuccess ? '✅ Passed' : '❌ Failed'}`);
  
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