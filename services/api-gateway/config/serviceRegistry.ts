/**
 * Service Registry for the API Gateway
 * Maps service names to their URLs
 */

export interface ServiceConfig {
  url: string;
  healthEndpoint: string;
  timeout: number;
}

export interface ServiceRegistry {
  [serviceName: string]: ServiceConfig;
}

/**
 * Get service registry with URLs from environment variables
 * Fallback to default development URLs if not provided
 */
export const getServiceRegistry = (): ServiceRegistry => {
  return {
    'user-service': {
      url: process.env.USER_SERVICE_URL || 'http://localhost:3001/api',
      healthEndpoint: '/health',
      timeout: 5000
    },
    'document-service': {
      url: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3002/api',
      healthEndpoint: '/health',
      timeout: 10000 // Longer timeout for document operations
    },
    'freezone-service': {
      url: process.env.FREEZONE_SERVICE_URL || 'http://localhost:3003/api',
      healthEndpoint: '/health',
      timeout: 5000
    },
    'ai-research-service': {
      url: process.env.AI_RESEARCH_SERVICE_URL || 'http://localhost:3004/api',
      healthEndpoint: '/health',
      timeout: 30000 // Long timeout for AI operations
    },
    'scraper-service': {
      url: process.env.SCRAPER_SERVICE_URL || 'http://localhost:3005/api',
      healthEndpoint: '/health',
      timeout: 60000 // Long timeout for web scraping
    }
  };
};

/**
 * Map routes to their respective services
 */
export const routeMap: { [route: string]: string } = {
  // User routes
  '/users': 'user-service',
  '/users/': 'user-service',
  '/auth': 'user-service',
  '/auth/': 'user-service',
  '/login': 'user-service',
  '/logout': 'user-service',
  '/register': 'user-service',
  '/profile': 'user-service',
  
  // Document routes
  '/documents': 'document-service',
  '/documents/': 'document-service',
  '/user-documents': 'document-service',
  '/user-documents/': 'document-service',
  '/templates': 'document-service',
  '/templates/': 'document-service',
  
  // Freezone routes
  '/freezones': 'freezone-service',
  '/freezones/': 'freezone-service',
  '/business-categories': 'freezone-service',
  '/business-categories/': 'freezone-service',
  '/business-activities': 'freezone-service',
  '/business-activities/': 'freezone-service',
  
  // AI Research routes
  '/research': 'ai-research-service',
  '/research/': 'ai-research-service',
  '/chat': 'ai-research-service',
  '/chat/': 'ai-research-service',
  '/assistant': 'ai-research-service',
  '/assistant/': 'ai-research-service',
  
  // Scraper routes
  '/scraper': 'scraper-service',
  '/scraper/': 'scraper-service',
  '/enrichment': 'scraper-service',
  '/enrichment/': 'scraper-service'
};

/**
 * Determine the target service for a given path
 * @param path The request path
 * @returns The service name
 */
export const getServiceForPath = (path: string): string | undefined => {
  // Extract the base path
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return undefined;
  }
  
  const basePath = `/${segments[0]}`;
  
  // First try exact match
  if (routeMap[path]) {
    return routeMap[path];
  }
  
  // Then try with trailing slash
  if (routeMap[`${path}/`]) {
    return routeMap[`${path}/`];
  }
  
  // Then try base path
  if (routeMap[basePath]) {
    return routeMap[basePath];
  }
  
  // Then try base path with trailing slash
  if (routeMap[`${basePath}/`]) {
    return routeMap[`${basePath}/`];
  }
  
  return undefined;
};