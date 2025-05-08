/**
 * Shared Configuration
 * 
 * Central configuration for all microservices
 */
export const config = {
  isProduction: process.env.NODE_ENV === 'production',
  
  // General service settings
  serviceName: process.env.SERVICE_NAME || 'freezone-management-system',
  
  // API Gateway configuration
  apiGateway: {
    port: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
    host: process.env.API_GATEWAY_HOST || '0.0.0.0',
  },
  
  // Document Service configuration
  documentService: {
    port: parseInt(process.env.DOCUMENT_SERVICE_PORT || '3001', 10),
    host: process.env.DOCUMENT_SERVICE_HOST || '0.0.0.0',
    cacheExpirationMs: parseInt(process.env.DOCUMENT_CACHE_EXPIRATION || '3600000', 10), // 1 hour
    uploadDir: process.env.DOCUMENT_UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },
  
  // Free Zone Service configuration
  freezoneService: {
    port: parseInt(process.env.FREEZONE_SERVICE_PORT || '3002', 10),
    host: process.env.FREEZONE_SERVICE_HOST || '0.0.0.0',
    cacheExpirationMs: parseInt(process.env.FREEZONE_CACHE_EXPIRATION || '3600000', 10), // 1 hour
  },
  
  // User Service configuration
  userService: {
    port: parseInt(process.env.USER_SERVICE_PORT || '3003', 10),
    host: process.env.USER_SERVICE_HOST || '0.0.0.0',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshTokenExpiresIn: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '7', 10), // 7 days
    passwordResetExpiresIn: parseInt(process.env.PASSWORD_RESET_EXPIRES_IN || '1', 10), // 1 hour
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10) * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    sessionSecret: process.env.SESSION_SECRET || 'session-dev-secret-change-in-production',
  },
  
  // Scraper Service configuration
  scraperService: {
    port: parseInt(process.env.SCRAPER_SERVICE_PORT || '3004', 10),
    host: process.env.SCRAPER_SERVICE_HOST || '0.0.0.0',
    interval: parseInt(process.env.SCRAPER_INTERVAL || '86400000', 10), // 24 hours
    timeout: parseInt(process.env.SCRAPER_TIMEOUT || '30000', 10), // 30 seconds
  },
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/freezone_db',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  },
  
  // Event Bus configuration
  eventBus: {
    reconnectIntervalMs: parseInt(process.env.EVENT_BUS_RECONNECT_INTERVAL || '5000', 10),
    maxRetries: parseInt(process.env.EVENT_BUS_MAX_RETRIES || '10', 10),
  },
  
  // Service Registry configuration
  serviceRegistry: {
    heartbeatIntervalMs: parseInt(process.env.REGISTRY_HEARTBEAT_INTERVAL || '30000', 10),
    timeoutMs: parseInt(process.env.REGISTRY_TIMEOUT || '90000', 10),
    cleanupIntervalMs: parseInt(process.env.REGISTRY_CLEANUP_INTERVAL || '300000', 10),
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
};

export default config;