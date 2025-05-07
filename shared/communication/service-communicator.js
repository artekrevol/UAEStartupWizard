/**
 * Service Communicator
 * 
 * A simplified API for microservices to communicate with each other using the message bus.
 * This module provides service-oriented abstractions over the raw message bus.
 */

import { createMessageBus, MessageBus, MessagePriority } from './message-bus.js';

// Global registry of message bus instances by service name
const messageBusRegistry = new Map();

// Default options for different message types
const DEFAULT_OPTIONS = {
  'service.register': { priority: MessagePriority.HIGH },
  'service.health': { priority: MessagePriority.HIGH },
  'system.alert': { priority: MessagePriority.CRITICAL },
  'default': { priority: MessagePriority.NORMAL }
};

/**
 * Implementation of the Service Communicator
 */
class ServiceCommunicator {
  constructor(serviceName) {
    this.serviceName = serviceName;
    
    // Get or create a message bus for this service
    if (!messageBusRegistry.has(serviceName)) {
      messageBusRegistry.set(serviceName, createMessageBus(serviceName));
    }
    
    this.messageBus = messageBusRegistry.get(serviceName);
  }

  /**
   * Send a message to a specific service
   */
  sendToService(destination, topic, data, options = {}) {
    const fullTopic = `${destination}.${topic}`;
    return this.messageBus.publish(fullTopic, data, this.mergeOptions(topic, options));
  }

  /**
   * Broadcast a message to all services
   */
  broadcast(topic, data, options = {}) {
    return this.messageBus.broadcast(topic, {
      ...data,
      _sender: this.serviceName,
      _timestamp: new Date().toISOString()
    }, this.mergeOptions(topic, options));
  }

  /**
   * Listen for messages on a specific topic
   */
  onMessage(topic, handler) {
    // Try to handle both scoped and non-scoped topics
    const unsubscribeFull = this.messageBus.subscribe(`${this.serviceName}.${topic}`, handler);
    const unsubscribeSimple = this.messageBus.subscribe(topic, handler);
    
    // Return a function that unsubscribes from both
    return () => {
      unsubscribeFull();
      unsubscribeSimple();
    };
  }

  /**
   * Respond to a request
   */
  respond(requestData, responseData) {
    if (!requestData._requestId || !requestData._replyTo) {
      console.error(`[ServiceCommunicator] Cannot respond to request, missing _requestId or _replyTo`);
      return;
    }
    
    const [destination, topic] = requestData._replyTo.split('.', 2);
    
    this.sendToService(destination, topic, responseData, {
      priority: MessagePriority.HIGH // Responses are high priority
    });
  }

  /**
   * Get the underlying message bus
   */
  getMessageBus() {
    return this.messageBus;
  }

  /**
   * Shutdown the communicator
   */
  shutdown() {
    this.messageBus.shutdown();
  }

  /**
   * Merge default options with provided options based on topic
   */
  mergeOptions(topic, options = {}) {
    const defaultOpts = DEFAULT_OPTIONS[topic] || DEFAULT_OPTIONS.default;
    return { ...defaultOpts, ...options };
  }
}

/**
 * Factory function to get a service communicator
 */
export function getCommunicator(serviceName) {
  return new ServiceCommunicator(serviceName);
}

// Re-export MessagePriority enum for convenience
export { MessagePriority };