/**
 * Event Bus
 * 
 * Event-driven communication infrastructure for microservices
 */
import { EventHandler, EventType, EventMessage } from './types';
import { v4 as uuidv4 } from 'uuid';

type EventSubscription = {
  eventType: string;
  handler: EventHandler;
};

/**
 * Simple memory-based event bus implementation
 * 
 * In a production environment, this would be replaced with a distributed
 * message broker like RabbitMQ, Kafka, or AWS SNS/SQS
 */
class EventBus {
  private subscribers: EventSubscription[] = [];
  private serviceName: string;
  
  constructor() {
    this.serviceName = process.env.SERVICE_NAME || 'unknown-service';
  }
  
  /**
   * Set the service name for this event bus instance
   */
  setServiceName(name: string): void {
    this.serviceName = name;
  }
  
  /**
   * Subscribe to an event type
   */
  subscribe(eventType: string, handler: EventHandler): void {
    this.subscribers.push({
      eventType,
      handler
    });
    
    console.log(`[EventBus] Subscribed to event: ${eventType}`);
  }
  
  /**
   * Unsubscribe from an event type
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    this.subscribers = this.subscribers.filter(
      sub => !(sub.eventType === eventType && sub.handler === handler)
    );
    
    console.log(`[EventBus] Unsubscribed from event: ${eventType}`);
  }
  
  /**
   * Publish an event to all subscribers
   */
  async publish<T>(eventType: string, payload: T, metadata?: Record<string, any>): Promise<void> {
    const event: EventMessage<T> = {
      id: uuidv4(),
      type: eventType as EventType,
      timestamp: new Date().toISOString(),
      producer: this.serviceName,
      payload,
      metadata
    };
    
    console.log(`[EventBus] Publishing event: ${eventType}`);
    
    const subscribers = this.subscribers.filter(sub => 
      sub.eventType === eventType || sub.eventType === '*'
    );
    
    for (const subscriber of subscribers) {
      try {
        await subscriber.handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error handling event ${eventType}:`, error);
      }
    }
  }
}

export const eventBus = new EventBus();
