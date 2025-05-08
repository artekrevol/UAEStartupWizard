/**
 * Test Runner Script
 * 
 * This script runs all the tests in the testing framework and generates reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting UAE Business Setup Platform QA Testing Framework');
console.log('='.repeat(80));

// Ensure report directories exist
const reportDirs = [
  'test/reports',
  'test/reports/coverage',
  'test/reports/playwright'
];

reportDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Function to run a command and handle errors
function runCommand(command, label) {
  console.log(`\n📋 Running ${label}...`);
  console.log('-'.repeat(80));
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`\n✅ ${label} completed successfully`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${label} failed with error:`);
    console.error(`   ${error.message}`);
    return false;
  }
}

// Collection to store test results
const results = {
  unit: false,
  integration: false,
  e2e: false
};

// Run unit tests
results.unit = runCommand('npx jest test/unit --config=jest.config.ts', 'Unit Tests');

// Run integration tests if unit tests pass
if (results.unit) {
  results.integration = runCommand('npx jest test/integration --config=jest.config.ts', 'Integration Tests');
} else {
  console.log('\n⚠️ Skipping Integration Tests due to Unit Test failures');
}

// Run E2E tests
results.e2e = runCommand('npx playwright test --config=playwright.config.ts', 'E2E Tests');

// Generate summary report
console.log('\n📊 Test Summary Report');
console.log('='.repeat(80));
console.log(`Unit Tests: ${results.unit ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Integration Tests: ${results.integration ? '✅ PASSED' : results.unit ? '❌ FAILED' : '⚠️ SKIPPED'}`);
console.log(`E2E Tests: ${results.e2e ? '✅ PASSED' : '❌ FAILED'}`);

// Generate execution timestamp
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
console.log(`\nTest run completed at: ${timestamp}`);

// Check if all tests passed
const allPassed = results.unit && results.integration && results.e2e;
console.log(`\nOverall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

// Notify about report locations
console.log('\n📄 Test Reports:');
console.log(`- Unit & Integration: test/reports/test-report.html`);
console.log(`- Coverage: test/reports/coverage/lcov-report/index.html`);
console.log(`- E2E Tests: test/reports/playwright/index.html`);

// Exit with appropriate code
process.exit(allPassed ? 0 : 1);