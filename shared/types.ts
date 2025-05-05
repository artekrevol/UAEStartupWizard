/**
 * Shared types for use across all microservices
 */

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  name?: string;
  company?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

// Document types
export interface Document {
  id: number;
  title: string;
  filename: string;
  filePath: string;
  mimetype: string;
  size: number;
  category: string;
  subcategory?: string;
  freeZoneId?: number;
  userId?: number;
  createdAt: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

// Freezone types
export interface FreeZone {
  id: number;
  name: string;
  description?: string;
  location?: string;
  website?: string;
  contactInfo?: string;
  benefits?: string[];
  industries?: string[];
  setupCost?: Record<string, any>;
  requirements?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

export interface BusinessActivity {
  id: number;
  name: string;
  code?: string;
  description?: string;
  category?: string;
  industryGroup?: string;
  permittedFreeZones?: number[];
  approvalRequirements?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

// AI Research types
export interface ResearchTopic {
  id: number;
  topic: string;
  userId?: number;
  status: ResearchStatus;
  results?: string;
  sources?: string[];
  createdAt: Date;
  completedAt?: Date;
}

export enum ResearchStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Conversation {
  id: number;
  userId?: number;
  topic: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Scraper types
export interface ScraperTask {
  id: number;
  url: string;
  type: ScraperTaskType;
  status: ScraperTaskStatus;
  priority: number;
  freeZoneId?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  results?: Record<string, any>;
  error?: string;
}

export enum ScraperTaskType {
  FREEZONE_INFO = 'freezone_info',
  DOCUMENT_DOWNLOAD = 'document_download',
  BUSINESS_ACTIVITY = 'business_activity',
  GENERAL = 'general'
}

export enum ScraperTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRY = 'retry'
}

// Error types
export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}
