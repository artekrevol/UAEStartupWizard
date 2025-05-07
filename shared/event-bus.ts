/**
 * Simple in-memory event bus for inter-service communication
 * In a production environment, this would be replaced with a proper message broker
 * like RabbitMQ, Kafka, or AWS SQS
 */
class EventBus {
  private subscribers: Map<string, Function[]> = new Map();
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Subscribe to an event
   * @param eventName The name of the event to subscribe to
   * @param callback The function to call when the event is published
   */
  subscribe(eventName: string, callback: Function): void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName)?.push(callback);
    console.log(`[${this.serviceName}] Subscribed to event: ${eventName}`);
  }

  /**
   * Publish an event
   * @param eventName The name of the event to publish
   * @param data The data to pass to the event subscribers
   */
  publish(eventName: string, data: any): void {
    console.log(`[${this.serviceName}] Publishing event: ${eventName}`);
    
    if (!this.subscribers.has(eventName)) {
      return;
    }
    
    this.subscribers.get(eventName)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[${this.serviceName}] Error in event handler for ${eventName}:`, error);
      }
    });
  }

  /**
   * Unsubscribe from an event
   * @param eventName The name of the event to unsubscribe from
   * @param callback The callback function to remove
   */
  unsubscribe(eventName: string, callback: Function): void {
    if (!this.subscribers.has(eventName)) {
      return;
    }
    
    const callbacks = this.subscribers.get(eventName) || [];
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
      console.log(`[${this.serviceName}] Unsubscribed from event: ${eventName}`);
    }
  }

  /**
   * Clear all subscribers for an event
   * @param eventName The name of the event to clear
   */
  clear(eventName: string): void {
    this.subscribers.delete(eventName);
    console.log(`[${this.serviceName}] Cleared all subscribers for event: ${eventName}`);
  }

  /**
   * Clear all subscribers for all events
   */
  clearAll(): void {
    this.subscribers.clear();
    console.log(`[${this.serviceName}] Cleared all subscribers for all events`);
  }

  /**
   * Shutdown the event bus
   */
  shutdown(): void {
    this.clearAll();
    console.log(`[${this.serviceName}] Event bus shut down`);
  }
}

// Create a singleton instance of the event bus
const eventBus = new EventBus('global');

// Export the event bus
export { eventBus, EventBus };