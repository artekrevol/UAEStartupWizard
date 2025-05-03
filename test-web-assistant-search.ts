/**
 * Test script for the WebResearchAssistant search functionality
 * 
 * This script tests the search functions of the WebResearchAssistant
 * to verify they're working correctly after the type safety fixes.
 */

import { searchDocuments, searchFreeZones, performWebResearch } from './server/WebResearchAssistant';

async function testFreeZoneSearch() {
  try {
    console.log('Testing Free Zone Search...');
    const results = await searchFreeZones('Dubai Internet City');
    console.log(`Found ${results.length} free zones matching 'Dubai Internet City':`);
    results.forEach((fz, i) => {
      console.log(`${i + 1}. ${fz.name} (ID: ${fz.id})`);
    });
    return results.length > 0;
  } catch (error) {
    console.error('Error in free zone search:', error);
    return false;
  }
}

async function testDocumentSearch() {
  try {
    console.log('\nTesting Document Search...');
    const results = await searchDocuments('business setup');
    console.log(`Found ${results.length} documents matching 'business setup':`);
    results.forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.title || 'Untitled'} (Category: ${doc.category || 'None'})`);
    });
    return results.length > 0;
  } catch (error) {
    console.error('Error in document search:', error);
    return false;
  }
}

async function testWebResearch() {
  try {
    console.log('\nTesting Web Research...');
    const results = await performWebResearch('How to set up a company in Dubai Internet City');
    console.log(`Research source: ${results.source}`);
    console.log(`Found ${results.results ? results.results.length : 0} results`);
    if (results.results && results.results.length > 0) {
      console.log('First result:');
      if (results.source === 'internal') {
        console.log(`- Title: ${results.results[0].title}`);
        console.log(`- Category: ${results.results[0].category}`);
      } else if (results.source === 'free_zones') {
        console.log(`- Name: ${results.results[0].name}`);
        console.log(`- Description: ${results.results[0].description?.substring(0, 100)}...`);
      }
    }
    return results.results && results.results.length > 0;
  } catch (error) {
    console.error('Error in web research:', error);
    return false;
  }
}

async function runTests() {
  console.log('=== WebResearchAssistant Test Suite ===');
  
  const freeZoneResults = await testFreeZoneSearch();
  const documentResults = await testDocumentSearch();
  const webResearchResults = await testWebResearch();
  
  console.log('\n=== Test Results ===');
  console.log(`Free Zone Search: ${freeZoneResults ? 'PASS' : 'FAIL'}`);
  console.log(`Document Search: ${documentResults ? 'PASS' : 'FAIL'}`);
  console.log(`Web Research: ${webResearchResults ? 'PASS' : 'FAIL'}`);
  
  if (freeZoneResults && documentResults && webResearchResults) {
    console.log('\nAll tests passed successfully!');
  } else {
    console.log('\nSome tests failed. Please check the logs above for details.');
  }
}

// Run all tests
runTests().catch(error => {
  console.error('Test suite error:', error);
});
