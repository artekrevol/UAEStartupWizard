/**
 * HTTP-only Fallback Utilities
 * 
 * This module provides fallback implementations for browser-based scrapers
 * when running in HTTP-only mode. It creates proxy objects that prevent
 * Playwright from being used and provides alternative implementations.
 */

/**
 * Creates a fallback for browser-based scrapers
 * @returns A proxy object with methods that log and handle browser-based requests in HTTP-only mode
 */
export function createBrowserFallback() {
  return {
    // Provides a mock browser context
    newContext: () => ({
      // Mock page methods
      newPage: async () => ({
        goto: async (url) => {
          console.log(`[HTTP-ONLY MODE] Skipping browser navigation to: ${url}`);
          return { status: () => 200 };
        },
        waitForSelector: async (selector) => {
          console.log(`[HTTP-ONLY MODE] Skipping browser wait for selector: ${selector}`);
          return null;
        },
        waitForTimeout: async (ms) => {
          console.log(`[HTTP-ONLY MODE] Skipping browser wait for ${ms}ms`);
        },
        click: async (selector) => {
          console.log(`[HTTP-ONLY MODE] Skipping browser click on: ${selector}`);
        },
        evaluate: async (fn) => {
          console.log(`[HTTP-ONLY MODE] Skipping browser evaluation`);
          return [];
        },
        $: async (selector) => {
          console.log(`[HTTP-ONLY MODE] Skipping browser selector: ${selector}`);
          return null;
        },
        $$: async (selector) => {
          console.log(`[HTTP-ONLY MODE] Skipping browser selector all: ${selector}`);
          return [];
        },
        $eval: async (selector, fn) => {
          console.log(`[HTTP-ONLY MODE] Skipping browser selector eval: ${selector}`);
          return null;
        },
        $$eval: async (selector, fn) => {
          console.log(`[HTTP-ONLY MODE] Skipping browser selector eval all: ${selector}`);
          return [];
        },
        content: async () => {
          console.log(`[HTTP-ONLY MODE] Returning empty content for browser page`);
          return '';
        },
        close: async () => {
          console.log(`[HTTP-ONLY MODE] Mock browser page closed`);
        }
      }),
      // Mock context methods
      close: async () => {
        console.log(`[HTTP-ONLY MODE] Mock browser context closed`);
      }
    }),
    // Mock browser close method
    close: async () => {
      console.log(`[HTTP-ONLY MODE] Mock browser closed`);
    }
  };
}

/**
 * Creates a mock Playwright browser object for HTTP-only mode
 * @returns A mock browser object
 */
export function createMockBrowser() {
  return {
    launch: () => {
      console.log('[HTTP-ONLY MODE] Providing mock browser instead of Playwright');
      return Promise.resolve(createBrowserFallback());
    }
  };
}

/**
 * Creates a mock Playwright module for HTTP-only mode
 * @returns A mock Playwright object
 */
export function createMockPlaywright() {
  const browser = createMockBrowser();
  return {
    chromium: browser,
    firefox: browser,
    webkit: browser
  };
}

// Export a pre-created instance for convenience
export const mockPlaywright = createMockPlaywright();