/**
 * Application Configuration
 * Centralized configuration settings for all services
 */

// Load environment variables
require('dotenv').config();

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';

// Default ports for services
const DEFAULT_API_GATEWAY_PORT = 3000;
const DEFAULT_DOCUMENT_SERVICE_PORT = 3001;
const DEFAULT_USER_SERVICE_PORT = 3002;
const DEFAULT_FREEZONE_SERVICE_PORT = 3003;
const DEFAULT_SCRAPER_SERVICE_PORT = 3004;
const DEFAULT_AI_SERVICE_PORT = 3005;

// Configuration object
export const config = {
  // General application settings
  app: {
    name: 'UAE Business Hub',
    environment: process.env.NODE_ENV || 'development',
    isDevelopment,
    isProduction: !isDevelopment,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000'
  },
  
  // API Gateway settings
  apiGateway: {
    port: parseInt(process.env.API_GATEWAY_PORT || DEFAULT_API_GATEWAY_PORT.toString(), 10),
    rateLimits: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },
  
  // Document service settings
  documentService: {
    port: parseInt(process.env.DOCUMENT_SERVICE_PORT || DEFAULT_DOCUMENT_SERVICE_PORT.toString(), 10),
    uploadDir: './uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png']
  },
  
  // User service settings
  userService: {
    port: parseInt(process.env.USER_SERVICE_PORT || DEFAULT_USER_SERVICE_PORT.toString(), 10),
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-for-development-only',
    jwtExpiresIn: '24h',
    saltRounds: 10
  },
  
  // Free Zone service settings
  freezoneService: {
    port: parseInt(process.env.FREEZONE_SERVICE_PORT || DEFAULT_FREEZONE_SERVICE_PORT.toString(), 10)
  },
  
  // Scraper service settings
  scraperService: {
    port: parseInt(process.env.SCRAPER_SERVICE_PORT || DEFAULT_SCRAPER_SERVICE_PORT.toString(), 10),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    timeout: 30000 // 30 seconds
  },
  
  // AI service settings
  aiService: {
    port: parseInt(process.env.AI_SERVICE_PORT || DEFAULT_AI_SERVICE_PORT.toString(), 10),
    openaiApiKey: process.env.OPENAI_API_KEY,
    defaultModel: 'gpt-4o'
  },
  
  // Database settings
  database: {
    connectionString: process.env.DATABASE_URL,
    maxConnections: 20,
    idleTimeoutMillis: 30000
  }
};