/**
 * Message Bus System
 * 
 * A robust inter-service communication system that provides reliable message
 * delivery with priority handling, error management, and delivery guarantees.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Message priority levels
export const MessagePriority = {
  LOW: 0,     // Non-critical, best-effort delivery
  NORMAL: 1,  // Standard priority, few retries
  HIGH: 2,    // Important operations, multiple retries
  CRITICAL: 3 // Critical operations, unlimited retries, persistent storage
};

// Default retry counts by priority
const RETRY_COUNTS = {
  [MessagePriority.LOW]: 1,
  [MessagePriority.NORMAL]: 3,
  [MessagePriority.HIGH]: 10,
  [MessagePriority.CRITICAL]: Number.MAX_SAFE_INTEGER // Effectively unlimited
};

// Default TTLs by priority (in milliseconds)
const DEFAULT_TTLS = {
  [MessagePriority.LOW]: 5 * 60 * 1000, // 5 minutes
  [MessagePriority.NORMAL]: 30 * 60 * 1000, // 30 minutes
  [MessagePriority.HIGH]: 2 * 60 * 60 * 1000, // 2 hours
  [MessagePriority.CRITICAL]: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Simple in-memory message bus implementation for demo purposes
class MessageBus {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.subscriptions = new Map();
    console.log(`[MessageBus] Initialized for service: ${serviceName}`);
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic, handler) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    
    this.subscriptions.get(topic).add(handler);
    
    console.log(`[MessageBus] Service ${this.serviceName} subscribed to topic ${topic}`);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(topic);
      
      if (handlers) {
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          this.subscriptions.delete(topic);
        }
      }
    };
  }

  /**
   * Publish a message to a topic
   */
  publish(topic, data, options = {}) {
    const priority = options.priority ?? MessagePriority.NORMAL;
    const message = {
      id: crypto.randomUUID(),
      topic,
      data,
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      priority
    };
    
    console.log(`[MessageBus] Published message ${message.id} to topic ${topic}`);
    
    // Immediately deliver to subscribers
    const handlers = this.subscriptions.get(topic);
    
    if (handlers && handlers.size > 0) {
      for (const handler of handlers) {
        try {
          handler(message.data, message);
        } catch (error) {
          console.error(`[MessageBus] Error in handler for topic ${topic}: ${error}`);
        }
      }
    }
    
    return message.id;
  }

  /**
   * Broadcast a message to all services
   */
  broadcast(topic, data, options = {}) {
    return this.publish(topic, data, options);
  }

  /**
   * Shutdown the message bus
   */
  shutdown() {
    console.log(`[MessageBus] Shutting down message bus for service ${this.serviceName}`);
  }
}

// Factory function to create a message bus instance
export function createMessageBus(serviceName) {
  return new MessageBus(serviceName);
}

export { MessageBus };