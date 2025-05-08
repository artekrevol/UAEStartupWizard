/**
 * Scraper Configuration
 * This file controls the behavior of all scrapers
 */

// Check if we're in HTTP-only mode (for deployments without browser support)
const isHttpOnlyMode = process.env.SCRAPER_HTTP_ONLY_MODE === 'true';

// Check if we're using memory cache instead of Redis
const useMemoryCache = process.env.USE_MEMORY_CACHE === 'true';

// Export configuration
export const scraperConfig = {
  // When true, all scrapers will use HTTP-only mode (no browser automation)
  httpOnlyMode: isHttpOnlyMode,
  
  // When true, use memory cache instead of Redis
  useMemoryCacheForRedis: useMemoryCache,
  
  // Common settings for all scrapers
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 30000
};

console.log(`[Scraper Config] Using HTTP-only mode: ${scraperConfig.httpOnlyMode ? 'YES' : 'NO'}`);
console.log(`[Scraper Config] Using memory cache fallback: ${scraperConfig.useMemoryCacheForRedis ? 'YES' : 'NO'}`);