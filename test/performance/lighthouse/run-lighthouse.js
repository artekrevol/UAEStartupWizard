/**
 * Performance Testing with Lighthouse
 * 
 * This script runs Lighthouse performance, accessibility, and best practices audits
 * on key pages of the UAE Business Setup Platform
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BASE_URL = 'http://localhost:5000';
const REPORT_DIR = path.join(__dirname, '../../reports/lighthouse');
const THRESHOLD = {
  performance: 0.7,   // 70%
  accessibility: 0.9, // 90%
  'best-practices': 0.85, // 85%
  seo: 0.9,          // 90%
};

// Pages to test
const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'freezones', path: '/freezones' },
  { name: 'register', path: '/register' },
  { name: 'login', path: '/login' },
];

// Create report directory if it doesn't exist
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Timestamp for report filenames
const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');

/**
 * Run Lighthouse audit for a specific URL
 */
async function runLighthouse(url, opts, config = null) {
  return lighthouse(url, opts, config);
}

/**
 * Main function to run all audits
 */
async function runAudits() {
  // Start Chrome
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
  });
  
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port
  };
  
  console.log('🔍 Starting Lighthouse Performance Tests');
  console.log('==========================================');
  
  let successCount = 0;
  const results = [];
  
  // Run lighthouse for each route
  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    console.log(`\nTesting ${route.name}: ${url}`);
    
    try {
      // Run lighthouse
      const runnerResult = await runLighthouse(url, options);
      
      // Save report
      const reportPath = path.join(REPORT_DIR, `${route.name}-${timestamp}.html`);
      fs.writeFileSync(reportPath, runnerResult.report);
      console.log(`Report saved to ${reportPath}`);
      
      // Extract scores
      const scores = Object.entries(runnerResult.lhr.categories).reduce((acc, [key, category]) => {
        acc[key] = category.score;
        return acc;
      }, {});
      
      // Check against thresholds
      let passedAllThresholds = true;
      
      console.log('Scores:');
      for (const [category, score] of Object.entries(scores)) {
        const threshold = THRESHOLD[category] || 0.7;
        const passed = score >= threshold;
        
        console.log(`  ${category}: ${Math.round(score * 100)}% ${passed ? '✅' : '❌'}`);
        
        if (!passed) {
          passedAllThresholds = false;
        }
      }
      
      // Summarize results
      if (passedAllThresholds) {
        console.log(`✅ ${route.name} passed all thresholds`);
        successCount++;
      } else {
        console.log(`❌ ${route.name} failed some thresholds`);
      }
      
      // Store results
      results.push({
        route: route.name,
        url,
        scores,
        passedAllThresholds
      });
    } catch (error) {
      console.error(`Error testing ${route.name}:`, error.message);
      
      // Store error result
      results.push({
        route: route.name,
        url,
        error: error.message
      });
    }
  }

  // Close Chrome
  await chrome.kill();
  
  // Save summary report
  const summaryPath = path.join(REPORT_DIR, `summary-${timestamp}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  
  // Print final summary
  console.log('\n==========================================');
  console.log(`📊 Performance Test Summary: ${successCount}/${ROUTES.length} routes passed`);
  console.log(`Overall Result: ${successCount === ROUTES.length ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Summary saved to ${summaryPath}`);
  
  // Return success/failure
  return successCount === ROUTES.length;
}

// Execute if this script is run directly
if (require.main === module) {
  runAudits()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error running lighthouse tests:', error);
      process.exit(1);
    });
}

module.exports = { runAudits };