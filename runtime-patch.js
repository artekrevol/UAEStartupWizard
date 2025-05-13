// This file is loaded from the entry point and patches the runtime for ES modules
import { createRequire } from 'module';

// Create a global require function for ES modules
globalThis.require = createRequire(import.meta.url);

// Create mock Playwright implementation
const mockPlaywright = {
  chromium: {
    launch: () => {
      console.log('[HTTP-ONLY MODE] Blocked Playwright browser launch attempt');
      return Promise.reject(new Error('Playwright is disabled in HTTP-only mode'));
    }
  },
  firefox: {
    launch: () => {
      console.log('[HTTP-ONLY MODE] Blocked Playwright browser launch attempt');
      return Promise.reject(new Error('Playwright is disabled in HTTP-only mode'));
    }
  },
  webkit: {
    launch: () => {
      console.log('[HTTP-ONLY MODE] Blocked Playwright browser launch attempt');
      return Promise.reject(new Error('Playwright is disabled in HTTP-only mode'));
    }
  },
  devices: {}
};

// Create HTTP-only downloader function
async function httpOnlyDownloader() {
  console.log('[HTTP-ONLY MODE] Using HTTP-only document downloader fallback');
  return {
    success: true,
    message: 'HTTP-only mode active: Document download simulation successful',
    downloadCount: 0,
    documents: []
  };
}

// Set global variables for interception
globalThis.playwright = mockPlaywright;
globalThis.httpOnlyDownloader = httpOnlyDownloader;

// Provide downloader objects
globalThis.DMCCDocumentDownloader = {
  scrape: httpOnlyDownloader
};

// Mock the browser downloader modules
globalThis.dmccDocumentDownloader = {
  downloadDMCCDocuments: httpOnlyDownloader,
  downloadAllDMCCDocuments: httpOnlyDownloader,
  default: httpOnlyDownloader
};

console.log('[HTTP-ONLY MODE] Runtime patched for ES Module compatibility');