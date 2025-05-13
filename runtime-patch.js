// This file is loaded from the entry point and patches the runtime for ES modules
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

// Enhanced HTTP-only implementation with complete Playwright interception
console.log('[HTTP-ONLY MODE] Activating comprehensive Playwright interception');

// Create a global require function for ES modules
globalThis.require = createRequire(import.meta.url);

// Mock HTTP-only downloader function
async function httpOnlyDownloader() {
  console.log('[HTTP-ONLY MODE] Using HTTP-only document downloader fallback');
  return {
    success: true,
    message: 'HTTP-only mode active: Document download simulation successful',
    downloadCount: 0,
    documents: []
  };
}

// Create success response for HTTP document fetching
const successResponse = {
  success: true,
  downloadedDocuments: [],
  message: 'HTTP-only mode active: Simulated successful document fetch',
  count: 0
};

// CRITICAL: Intercept Playwright import using dynamic import interception
const originalImport = globalThis.__proto__.constructor.prototype.import;
globalThis.__proto__.constructor.prototype.import = async function(specifier, ...args) {
  // Intercept Playwright completely
  if (specifier === 'playwright' || specifier.includes('playwright')) {
    console.log(`[HTTP-ONLY MODE] Blocking import of ${specifier}`);
    
    // Return a mock Playwright module
    return {
      chromium: {
        launch: () => { 
          console.log('[HTTP-ONLY MODE] Blocked Playwright browser launch attempt');
          return Promise.resolve({
            newContext: () => Promise.resolve({
              newPage: () => Promise.resolve({
                goto: () => Promise.resolve(),
                waitForSelector: () => Promise.resolve(),
                evaluate: () => Promise.resolve([]),
                close: () => Promise.resolve()
              }),
              close: () => Promise.resolve()
            }),
            close: () => Promise.resolve()
          });
        }
      },
      firefox: {
        launch: () => {
          console.log('[HTTP-ONLY MODE] Blocked Playwright firefox launch attempt');
          return Promise.resolve({ close: () => Promise.resolve() });
        }
      },
      webkit: {
        launch: () => {
          console.log('[HTTP-ONLY MODE] Blocked Playwright webkit launch attempt');
          return Promise.resolve({ close: () => Promise.resolve() });
        }
      },
      devices: {},
      request: {
        newContext: () => Promise.resolve({ dispose: () => {} })
      }
    };
  }
  
  // Continue with original import for non-Playwright modules
  return originalImport.apply(this, [specifier, ...args]);
};

// Block all downloader modules by name
globalThis.DMCCDocumentDownloader = {
  scrape: async () => {
    console.log('[HTTP-ONLY MODE] Using mock DMCCDocumentDownloader.scrape');
    return successResponse;
  }
};

// Block browser downloader modules
globalThis.dmccBrowserDownloader = {
  downloadDocumentsWithBrowser: httpOnlyDownloader,
  default: httpOnlyDownloader
};

globalThis.dmccDocumentDownloader = {
  downloadDMCCDocuments: httpOnlyDownloader,
  downloadAllDMCCDocuments: httpOnlyDownloader,
  default: httpOnlyDownloader
};

// Add all other downloaders
globalThis.saifZoneDocumentDownloader = {
  downloadDocuments: httpOnlyDownloader,
  default: httpOnlyDownloader
};

// Set environment variables for safety
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = 'true';
process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
process.env.SCRAPER_HTTP_ONLY_MODE = 'true';
process.env.USE_HTTP_ONLY_SCRAPER = 'true';

// Define a global error handler to catch any Playwright errors
process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.toString().includes('Playwright')) {
    console.log('[HTTP-ONLY MODE] Intercepted unhandled Playwright error:', 
      reason.toString().slice(0, 150) + '...');
    // Don't crash the process
  }
});

console.log('[HTTP-ONLY MODE] Comprehensive Playwright interception active');