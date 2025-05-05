/**
 * Shared Event Bus Library for Microservices
 * 
 * This module provides event-driven communication infrastructure for microservices.
 */

// Event types for inter-service communication
export enum EventType {
  // User events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  
  // Document events
  DOCUMENT_UPLOADED = 'document.uploaded',
  DOCUMENT_UPDATED = 'document.updated',
  DOCUMENT_DELETED = 'document.deleted',
  
  // Free zone events
  FREEZONE_UPDATED = 'freezone.updated',
  BUSINESS_ACTIVITY_UPDATED = 'business_activity.updated',
  
  // Research events
  RESEARCH_REQUESTED = 'research.requested',
  RESEARCH_COMPLETED = 'research.completed',
  
  // Scraper events
  SCRAPER_TASK_CREATED = 'scraper.task.created',
  SCRAPER_TASK_COMPLETED = 'scraper.task.completed',
  SCRAPER_TASK_FAILED = 'scraper.task.failed'
}

// Interface for event objects
export interface Event {
  id: string;
  type: EventType;
  timestamp: Date;
  data: unknown;
}

// Interface for event handlers
export type EventHandler = (event: Event) => Promise<void>;

// Interface for event bus implementation
export interface EventBus {
  subscribe(eventType: EventType, handler: EventHandler): void;
  unsubscribe(eventType: EventType, handler: EventHandler): void;
  publish(event: Event): Promise<void>;
}

// Factory function to create an event
export function createEvent(type: EventType, data: unknown): Event {
  return {
    id: generateEventId(),
    type,
    timestamp: new Date(),
    data
  };
}

// Generate unique ID for events
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// In-memory event bus implementation (for local development)
class InMemoryEventBus implements EventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map();
  
  subscribe(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
    console.log(`[EventBus] Subscribed to ${eventType}`);
  }
  
  unsubscribe(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      this.handlers.set(eventType, handlers);
      console.log(`[EventBus] Unsubscribed from ${eventType}`);
    }
  }
  
  async publish(event: Event): Promise<void> {
    console.log(`[EventBus] Publishing event: ${event.type}`, event);
    
    const handlers = this.handlers.get(event.type) || [];
    const promises = handlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${event.type}:`, error);
      }
    });
    
    await Promise.all(promises);
  }
}

// RabbitMQ event bus implementation (for production)
// This would be replaced with actual RabbitMQ implementation
class RabbitMQEventBus implements EventBus {
  // Connect to RabbitMQ and set up channels
  constructor() {
    console.log('[EventBus] Connecting to RabbitMQ...');
    // In production, establish connection to RabbitMQ
  }
  
  subscribe(eventType: EventType, handler: EventHandler): void {
    console.log(`[EventBus] Subscribed to ${eventType} via RabbitMQ`);
    // In production, set up consumers in RabbitMQ
  }
  
  unsubscribe(eventType: EventType, handler: EventHandler): void {
    console.log(`[EventBus] Unsubscribed from ${eventType} via RabbitMQ`);
    // In production, cancel consumers in RabbitMQ
  }
  
  async publish(event: Event): Promise<void> {
    console.log(`[EventBus] Publishing event to RabbitMQ: ${event.type}`);
    // In production, publish to RabbitMQ exchange
  }
}

// Factory function to create the appropriate event bus based on environment
export function createEventBus(): EventBus {
  // Use RabbitMQ in production, InMemory for development
  if (process.env.NODE_ENV === 'production') {
    // In a real implementation, we would connect to RabbitMQ here
    // For now, use InMemoryEventBus
    console.log('[EventBus] Using in-memory event bus (production RabbitMQ not implemented yet)');
    return new InMemoryEventBus();
  } else {
    console.log('[EventBus] Using in-memory event bus');
    return new InMemoryEventBus();
  }
}
