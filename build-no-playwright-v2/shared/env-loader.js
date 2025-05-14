/**
 * Environment Variable Loader with Fallbacks
 * 
 * This module loads environment variables with production fallbacks
 * to prevent application crashes due to missing environment variables.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default values for critical environment variables
const DEFAULT_ENV_VALUES = {
  // Service URLs
  API_GATEWAY_URL: 'http://localhost:5000',
  USER_SERVICE_URL: 'http://localhost:3001',
  DOCUMENT_SERVICE_URL: 'http://localhost:3002',
  FREEZONE_SERVICE_URL: 'http://localhost:3003',
  SCRAPER_SERVICE_URL: 'http://localhost:3004',
  AI_RESEARCH_SERVICE_URL: 'http://localhost:3005',
  
  // Service ports
  API_GATEWAY_PORT: '5000',
  USER_SERVICE_PORT: '3001',
  DOCUMENT_SERVICE_PORT: '3002',
  FREEZONE_SERVICE_PORT: '3003',
  SCRAPER_SERVICE_PORT: '3004',
  AI_RESEARCH_SERVICE_PORT: '3005',
  
  // Authentication
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  SERVICE_AUTH_KEY: crypto.randomBytes(32).toString('hex'),
  
  // Feature flags
  SCRAPER_HTTP_ONLY_MODE: 'true',
  USE_MEMORY_CACHE: 'true',
  
  // Cache settings
  CACHE_SHORT_TTL: '60',
  CACHE_MEDIUM_TTL: '300',
  CACHE_LONG_TTL: '3600',
  
  // Error handling
  ERROR_LOGGING_ENABLED: 'true',
  
  // Node environment
  NODE_ENV: 'production'
};

/**
 * Load environment variables with fallbacks for production
 */
export function loadEnvironment() {
  // Determine environment
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  
  console.log(`[Environment] Loading environment for ${nodeEnv} mode`);
  
  // Load environment files
  try {
    // Load base .env file
    const baseEnvPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(baseEnvPath)) {
      console.log('[Environment] Loading base .env file');
      dotenv.config({ path: baseEnvPath });
    }
    
    // Load environment-specific .env file
    const envFilePath = path.resolve(__dirname, '..', `.env.${nodeEnv}`);
    if (fs.existsSync(envFilePath)) {
      console.log(`[Environment] Loading ${nodeEnv} environment file`);
      dotenv.config({ path: envFilePath });
    }
  } catch (error) {
    console.warn('[Environment] Error loading environment files:', error.message);
  }
  
  // In production, use fallbacks for any missing critical variables
  if (isProduction) {
    let missingVars = [];
    let setVars = [];
    
    for (const [key, defaultValue] of Object.entries(DEFAULT_ENV_VALUES)) {
      if (!process.env[key]) {
        process.env[key] = defaultValue;
        setVars.push(key);
      }
    }
    
    if (setVars.length > 0) {
      console.log(`[Environment] Set fallbacks for: ${setVars.join(', ')}`);
    }
  }
  
  return {
    isProduction,
    environment: nodeEnv
  };
}

// Automatically load environment if this file is imported
export const { isProduction, environment } = loadEnvironment();