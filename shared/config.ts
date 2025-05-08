/**
 * Config file for the User Service
 * 
 * Provides configuration values from environment variables with defaults
 */
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Environment validation
const requiredEnvVars = [
  'DATABASE_URL',
  'USER_SERVICE_JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar] && process.env.NODE_ENV === 'production'
);

if (missingEnvVars.length > 0) {
  console.warn(
    `Missing required environment variables: ${missingEnvVars.join(', ')}. Using default values for development.`
  );
}

// Configuration with defaults
export const config = {
  env: process.env.NODE_ENV || 'development',
  apiGateway: {
    port: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
    host: process.env.API_GATEWAY_HOST || '0.0.0.0',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  userService: {
    port: parseInt(process.env.USER_SERVICE_PORT || '3001', 10),
    host: process.env.USER_SERVICE_HOST || '0.0.0.0',
    jwtSecret: process.env.USER_SERVICE_JWT_SECRET || 'dev_jwt_secret_key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
    maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10),
    lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
    sessionTimeoutHours: parseInt(process.env.SESSION_TIMEOUT_HOURS || '24', 10),
  },
  documentsService: {
    port: parseInt(process.env.DOCUMENTS_SERVICE_PORT || '3002', 10),
    host: process.env.DOCUMENTS_SERVICE_HOST || '0.0.0.0',
  },
  freezoneService: {
    port: parseInt(process.env.FREEZONE_SERVICE_PORT || '3003', 10),
    host: process.env.FREEZONE_SERVICE_HOST || '0.0.0.0',
    cacheExpirationMs: parseInt(process.env.FREEZONE_CACHE_EXPIRATION_MS || '3600000', 10), // 1 hour
  },
  scraperService: {
    port: parseInt(process.env.SCRAPER_SERVICE_PORT || '3004', 10),
    host: process.env.SCRAPER_SERVICE_HOST || '0.0.0.0',
  },
  serviceRegistry: {
    heartbeatIntervalMs: parseInt(process.env.SERVICE_REGISTRY_HEARTBEAT_INTERVAL_MS || '10000', 10), // 10 seconds
    timeoutMs: parseInt(process.env.SERVICE_REGISTRY_TIMEOUT_MS || '30000', 10), // 30 seconds
    cleanupIntervalMs: parseInt(process.env.SERVICE_REGISTRY_CLEANUP_INTERVAL_MS || '60000', 10), // 1 minute
    host: process.env.SERVICE_REGISTRY_HOST || '0.0.0.0',
    port: parseInt(process.env.SERVICE_REGISTRY_PORT || '3005', 10),
  },
  eventBus: {
    reconnectInterval: parseInt(process.env.EVENT_BUS_RECONNECT_INTERVAL || '5000', 10), // 5 seconds
    pingTimeoutMs: parseInt(process.env.EVENT_BUS_PING_TIMEOUT || '30000', 10), // 30 seconds
  },
  database: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/uae-business',
    connectionPoolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    connectionPoolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
    connectionTimeoutMs: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '30000', 10), // 30 seconds
  },
  uploads: {
    maxSizeBytes: parseInt(process.env.UPLOAD_MAX_SIZE_BYTES || String(10 * 1024 * 1024), 10), // 10MB
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'text/plain',
    ],
    storageDir: process.env.UPLOAD_STORAGE_DIR || path.join(process.cwd(), 'uploads'),
  },
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests per minute
    cookieSecret: process.env.COOKIE_SECRET || 'dev_cookie_secret',
    csrfEnabled: process.env.CSRF_ENABLED === 'true',
    secureCookies: process.env.SECURE_COOKIES === 'true' || process.env.NODE_ENV === 'production',
    // Service API keys for inter-service authentication
    serviceApiKeys: {
      'api-gateway': process.env.API_GATEWAY_KEY || 'dev_api_gateway_key',
      'user-service': process.env.USER_SERVICE_KEY || 'dev_user_service_key',
      'document-service': process.env.DOCUMENT_SERVICE_KEY || 'dev_document_service_key',
      'freezone-service': process.env.FREEZONE_SERVICE_KEY || 'dev_freezone_service_key',
      'ai-service': process.env.AI_SERVICE_KEY || 'dev_ai_service_key',
      'scraper-service': process.env.SCRAPER_SERVICE_KEY || 'dev_scraper_service_key',
    },
    // Content security policy configuration
    contentSecurityPolicy: {
      enabled: process.env.ENABLE_CSP === 'true' || process.env.NODE_ENV === 'production',
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // Consider restricting these in production
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", process.env.API_URL || '*'],
      }
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.LOG_PRETTY_PRINT === 'true' || process.env.NODE_ENV !== 'production',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    defaultTtl: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10), // 1 hour default TTL
  },
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    browserMaxAge: parseInt(process.env.BROWSER_CACHE_MAX_AGE || '86400', 10), // 24 hours
    serverMaxAge: parseInt(process.env.SERVER_CACHE_MAX_AGE || '3600', 10),    // 1 hour
  },
};