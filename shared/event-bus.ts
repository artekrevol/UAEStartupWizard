/**
 * Event Bus for Inter-Service Communication
 * 
 * This module provides an event-based message bus for communication between microservices.
 * It implements a simple publish/subscribe pattern to allow services to broadcast
 * and listen for events without direct coupling.
 */
import { logger } from './logger';

// Event handler type
type EventHandler = (data: any) => Promise<void> | void;

// Simple in-memory implementation
// In a production environment, this would be replaced with RabbitMQ, Kafka, etc.
class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();

  /**
   * Subscribe to an event
   * 
   * @param event The event name to subscribe to
   * @param handler The handler function to call when the event is published
   */
  subscribe(event: string, handler: EventHandler): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    
    this.subscribers.get(event)!.push(handler);
    logger.debug(`Subscribed to event: ${event}`, { 
      subscribersCount: this.subscribers.get(event)!.length 
    });
  }

  /**
   * Unsubscribe from an event
   * 
   * @param event The event name to unsubscribe from
   * @param handler The handler function to remove
   */
  unsubscribe(event: string, handler: EventHandler): void {
    if (!this.subscribers.has(event)) {
      return;
    }
    
    const handlers = this.subscribers.get(event)!;
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
      logger.debug(`Unsubscribed from event: ${event}`, { 
        subscribersCount: handlers.length 
      });
    }
  }

  /**
   * Publish an event
   * 
   * @param event The event name to publish
   * @param data The data to pass to subscribers
   */
  publish(event: string, data: any): void {
    logger.debug(`Publishing event: ${event}`, { data });
    
    if (!this.subscribers.has(event)) {
      return;
    }
    
    for (const handler of this.subscribers.get(event)!) {
      try {
        // Execute handler
        const result = handler(data);
        
        // If handler returns a promise, catch errors
        if (result instanceof Promise) {
          result.catch(error => {
            logger.error(`Error in event handler for ${event}`, { 
              error: error.message,
              event,
              data 
            });
          });
        }
      } catch (error: any) {
        logger.error(`Error in event handler for ${event}`, { 
          error: error.message,
          event,
          data 
        });
      }
    }
  }

  /**
   * Get the number of subscribers for an event
   * 
   * @param event The event name
   * @returns The number of subscribers
   */
  subscriberCount(event: string): number {
    return this.subscribers.has(event) ? this.subscribers.get(event)!.length : 0;
  }

  /**
   * List all events with subscribers
   * 
   * @returns Array of event names
   */
  listEvents(): string[] {
    return Array.from(this.subscribers.keys());
  }

  /**
   * Shutdown the event bus
   * Cleans up all subscriptions and resources
   */
  shutdown(): void {
    logger.info('Shutting down event bus');
    this.subscribers.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();