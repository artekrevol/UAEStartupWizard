/**
 * Shared Event Bus for microservice communication
 * 
 * This module provides a common interface for publishing and subscribing to events
 * across microservices using a message broker (RabbitMQ/Kafka).
 */

export enum EventType {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  
  DOCUMENT_UPLOADED = 'document.uploaded',
  DOCUMENT_PROCESSED = 'document.processed',
  DOCUMENT_DELETED = 'document.deleted',
  
  FREEZONE_UPDATED = 'freezone.updated',
  FREEZONE_DELETED = 'freezone.deleted',
  
  RESEARCH_REQUESTED = 'research.requested',
  RESEARCH_COMPLETED = 'research.completed',
  
  SCRAPER_TASK_CREATED = 'scraper.task.created',
  SCRAPER_TASK_COMPLETED = 'scraper.task.completed',
  SCRAPER_TASK_FAILED = 'scraper.task.failed'
}

export interface Event<T = any> {
  id: string;
  type: EventType;
  timestamp: number;
  data: T;
  metadata?: Record<string, any>;
}

// Will be implemented with actual message broker
export interface EventBus {
  publish<T>(event: Event<T>): Promise<void>;
  subscribe<T>(eventType: EventType, handler: (event: Event<T>) => Promise<void>): Promise<void>;
  unsubscribe(eventType: EventType): Promise<void>;
}

// Mock implementation for development
class MockEventBus implements EventBus {
  private handlers: Record<string, Array<(event: any) => Promise<void>>> = {};

  async publish<T>(event: Event<T>): Promise<void> {
    const handlers = this.handlers[event.type] || [];
    await Promise.all(handlers.map(handler => handler(event)));
    console.log(`[EventBus] Published event: ${event.type}`);
  }

  async subscribe<T>(eventType: EventType, handler: (event: Event<T>) => Promise<void>): Promise<void> {
    if (!this.handlers[eventType]) {
      this.handlers[eventType] = [];
    }
    this.handlers[eventType].push(handler);
    console.log(`[EventBus] Subscribed to event: ${eventType}`);
  }

  async unsubscribe(eventType: EventType): Promise<void> {
    delete this.handlers[eventType];
    console.log(`[EventBus] Unsubscribed from event: ${eventType}`);
  }
}

// Factory function to create event bus instance
export function createEventBus(): EventBus {
  // In production, this would create a RabbitMQ or Kafka client
  return new MockEventBus();
}

// Helper function to create an event
export function createEvent<T>(type: EventType, data: T, metadata?: Record<string, any>): Event<T> {
  return {
    id: generateEventId(),
    type,
    timestamp: Date.now(),
    data,
    metadata
  };
}

// Helper function to generate a unique event ID
function generateEventId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
