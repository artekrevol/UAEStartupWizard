/**
 * Shared Types
 * 
 * Common type definitions used across microservices
 */

/**
 * User roles in the system
 */
export enum UserRole {
  ADMIN = 'admin',
  ANALYST = 'analyst',
  USER = 'user',
  GUEST = 'guest'
}

/**
 * Document types
 */
export enum DocumentType {
  PDF = 'pdf',
  WORD = 'word',
  EXCEL = 'excel',
  TEXT = 'text',
  IMAGE = 'image',
  HTML = 'html',
  OTHER = 'other'
}

/**
 * Business activity categories
 */
export enum BusinessActivityCategory {
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  RETAIL = 'retail',
  MANUFACTURING = 'manufacturing',
  SERVICES = 'services',
  LOGISTICS = 'logistics',
  MEDIA = 'media',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  OTHER = 'other'
}

/**
 * Research status for web research tasks
 */
export enum ResearchStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Scraper task types
 */
export enum ScraperTaskType {
  FREEZONE_INFO = 'freezone_info',
  DOCUMENT_DOWNLOAD = 'document_download',
  BUSINESS_ACTIVITY = 'business_activity',
  GENERAL = 'general'
}

/**
 * Scraper task status
 */
export enum ScraperTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRY = 'retry'
}

/**
 * Event types for inter-service communication
 */
export enum EventType {
  // User service events
  USER_CREATED = 'user:created',
  USER_UPDATED = 'user:updated',
  USER_DELETED = 'user:deleted',
  USER_LOGIN = 'user:login',
  
  // Document service events
  DOCUMENT_CREATED = 'document:created',
  DOCUMENT_UPDATED = 'document:updated',
  DOCUMENT_DELETED = 'document:deleted',
  DOCUMENT_PROCESSED = 'document:processed',
  
  // Freezone service events
  FREEZONE_CREATED = 'freezone:created',
  FREEZONE_UPDATED = 'freezone:updated',
  FREEZONE_DELETED = 'freezone:deleted',
  BUSINESS_SETUP_STARTED = 'freezone:business-setup-started',
  BUSINESS_SETUP_UPDATED = 'freezone:business-setup-updated',
  BUSINESS_SETUP_COMPLETED = 'freezone:business-setup-completed',
  
  // AI research service events
  RESEARCH_REQUESTED = 'research:requested',
  RESEARCH_COMPLETED = 'research:completed',
  RESEARCH_FAILED = 'research:failed',
  CONVERSATION_CREATED = 'conversation:created',
  
  // Scraper service events
  SCRAPER_TASK_CREATED = 'scraper:task-created',
  SCRAPER_TASK_COMPLETED = 'scraper:task-completed',
  SCRAPER_TASK_FAILED = 'scraper:task-failed',
  
  // System-wide events
  SYSTEM_ERROR = 'system:error',
  SYSTEM_ALERT = 'system:alert'
}

/**
 * Generic event message structure
 */
export interface EventMessage<T = any> {
  id: string;
  type: EventType;
  timestamp: string;
  producer: string;
  payload: T;
  metadata?: Record<string, any>;
}

/**
 * Event handler function type
 */
export type EventHandler<T = any> = (data: T) => Promise<void>;
