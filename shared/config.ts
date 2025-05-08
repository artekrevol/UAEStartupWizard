/**
 * Shared Configuration
 * 
 * This module provides consistent configuration values across all services.
 * It centralizes environment variable access and provides sensible defaults.
 */

// Service-specific configurations
export const config = {
  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10)
  },
  
  // API Gateway configuration
  apiGateway: {
    port: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
    host: process.env.API_GATEWAY_HOST || 'localhost'
  },
  
  // Document Service configuration
  documentService: {
    port: parseInt(process.env.DOCUMENT_SERVICE_PORT || '3001', 10),
    host: process.env.DOCUMENT_SERVICE_HOST || 'localhost',
    uploadsDir: process.env.DOCUMENT_UPLOADS_DIR || './uploads',
    maxFileSize: parseInt(process.env.DOCUMENT_MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedFileTypes: (process.env.DOCUMENT_ALLOWED_FILE_TYPES || 'pdf,doc,docx,txt,xls,xlsx,ppt,pptx,csv,jpg,jpeg,png,odt').split(',')
  },
  
  // Free Zone Service configuration
  freezoneService: {
    port: parseInt(process.env.FREEZONE_SERVICE_PORT || '3002', 10),
    host: process.env.FREEZONE_SERVICE_HOST || 'localhost',
    cacheExpirationMs: parseInt(process.env.FREEZONE_CACHE_EXPIRATION || '3600000', 10) // 1 hour
  },
  
  // User Service configuration
  userService: {
    port: parseInt(process.env.USER_SERVICE_PORT || '3003', 10),
    host: process.env.USER_SERVICE_HOST || 'localhost',
    saltRounds: parseInt(process.env.USER_PASSWORD_SALT_ROUNDS || '10', 10),
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    sessionExpirationMs: parseInt(process.env.USER_SESSION_EXPIRATION || '86400000', 10), // 24 hours
    verificationTokenExpirationMs: parseInt(process.env.VERIFICATION_TOKEN_EXPIRATION || '86400000', 10), // 24 hours
    resetTokenExpirationMs: parseInt(process.env.RESET_TOKEN_EXPIRATION || '3600000', 10) // 1 hour
  },
  
  // Scraper Service configuration
  scraperService: {
    port: parseInt(process.env.SCRAPER_SERVICE_PORT || '3004', 10),
    host: process.env.SCRAPER_SERVICE_HOST || 'localhost',
    concurrencyLimit: parseInt(process.env.SCRAPER_CONCURRENCY_LIMIT || '5', 10),
    requestDelayMs: parseInt(process.env.SCRAPER_REQUEST_DELAY || '1000', 10),
    userAgent: process.env.SCRAPER_USER_AGENT || 'UAE-Business-Setup-Bot/1.0 (https://uae-business-setup.com)'
  },
  
  // Event Bus configuration
  eventBus: {
    retryAttempts: parseInt(process.env.EVENT_BUS_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.EVENT_BUS_RETRY_DELAY || '1000', 10),
    expirationMs: parseInt(process.env.EVENT_BUS_EXPIRATION || '86400000', 10) // 24 hours
  },
  
  // OpenAI API configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.5'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1024', 10),
    topP: parseFloat(process.env.OPENAI_TOP_P || '1.0')
  },
  
  // Service Registry configuration
  serviceRegistry: {
    heartbeatIntervalMs: parseInt(process.env.REGISTRY_HEARTBEAT_INTERVAL || '30000', 10), // 30 seconds
    timeoutMs: parseInt(process.env.REGISTRY_TIMEOUT || '120000', 10), // 2 minutes
    cleanupIntervalMs: parseInt(process.env.REGISTRY_CLEANUP_INTERVAL || '300000', 10) // 5 minutes
  },
  
  // Rate Limiting configuration
  rateLimiter: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    maxRequestsAuth: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '30', 10)
  },
  
  // Email configuration
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@uae-business-setup.com'
  },
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};

// Export default config
export default config;