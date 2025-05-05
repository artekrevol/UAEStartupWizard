/**
 * Shared Types Library for Microservices
 * 
 * This module provides standardized types across all microservices.
 */

/**
 * User roles
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  ANALYST = 'analyst'
}

/**
 * Research status
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
 * Document types
 */
export enum DocumentType {
  PDF = 'pdf',
  WORD = 'word',
  EXCEL = 'excel',
  IMAGE = 'image',
  TEXT = 'text',
  OTHER = 'other'
}

/**
 * Document category
 */
export enum DocumentCategory {
  BUSINESS_SETUP = 'business_setup',
  VISA = 'visa',
  LEGAL = 'legal',
  FINANCIAL = 'financial',
  LICENSING = 'licensing',
  GENERAL = 'general'
}

/**
 * Business activity category
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
 * Business setup status
 */
export enum BusinessSetupStatus {
  INITIAL = 'initial',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold'
}

/**
 * User type for service communication
 */
export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  name?: string;
  createdAt: Date;
}

/**
 * Document type for service communication
 */
export interface Document {
  id: number;
  title: string;
  filename: string;
  mimetype: string;
  size: number;
  category: string;
  subcategory?: string;
  freeZoneId?: number;
  userId?: number;
  createdAt: Date;
}

/**
 * Free zone type for service communication
 */
export interface FreeZone {
  id: number;
  name: string;
  description: string;
  location: string;
  website: string;
  benefits: string[];
  industries: string[];
  setupCost: {
    license: number;
    registration: number;
    visa: number;
  };
  requirements?: {
    documents: string[];
    process: string[];
    timeline: string;
  };
}

/**
 * Business activity type for service communication
 */
export interface BusinessActivity {
  id: number;
  name: string;
  code: string;
  description: string;
  category: string;
  industryGroup: string;
  permittedFreeZones: number[];
  approvalRequirements: {
    approvalTime: string;
    specialApprovals: boolean;
    approvingAuthority?: string;
  };
}

/**
 * Research topic type for service communication
 */
export interface ResearchTopic {
  id: number;
  topic: string;
  status: ResearchStatus;
  userId?: number;
  results?: string;
  sources?: string[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Scraper task type for service communication
 */
export interface ScraperTask {
  id: number;
  url: string;
  type: ScraperTaskType;
  status: ScraperTaskStatus;
  priority: number;
  freeZoneId?: number;
  results?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
