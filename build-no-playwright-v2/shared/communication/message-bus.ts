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
export enum MessagePriority {
  LOW = 0,     // Non-critical, best-effort delivery
  NORMAL = 1,  // Standard priority, few retries
  HIGH = 2,    // Important operations, multiple retries
  CRITICAL = 3 // Critical operations, unlimited retries, persistent storage
}

// Message delivery options
export interface MessageOptions {
  priority?: MessagePriority;
  ttl?: number;  // Time-to-live in milliseconds
  retries?: number; // Override default retry count based on priority
  idempotencyKey?: string; // For deduplication
}

// Message structure
export interface Message<T = any> {
  id: string;
  topic: string;
  data: T;
  source: string;
  timestamp: string;
  priority: MessagePriority;
  ttl: number;
  attempts: number;
  maxRetries: number;
  idempotencyKey?: string;
}

// Subscription callback function type
export type MessageHandler<T = any> = (data: T, message: Message<T>) => void | Promise<void>;

// Response handler for request-response pattern
export type ResponseHandler<T = any> = (response: T) => void;

// Message queue entry with metadata
interface QueueEntry {
  message: Message;
  nextAttempt: number;
  backoffDelay: number;
}

// Message Bus class
export class MessageBus {
  private serviceName: string;
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private requestHandlers: Map<string, ResponseHandler> = new Map();
  private messageQueue: QueueEntry[] = [];
  private processingQueue: boolean = false;
  private storageDir: string;
  private persistentMessageIds: Set<string> = new Set();
  
  // Default retry counts by priority
  private static readonly RETRY_COUNTS = {
    [MessagePriority.LOW]: 1,
    [MessagePriority.NORMAL]: 3,
    [MessagePriority.HIGH]: 10,
    [MessagePriority.CRITICAL]: Number.MAX_SAFE_INTEGER // Effectively unlimited
  };
  
  // Default TTLs by priority (in milliseconds)
  private static readonly DEFAULT_TTLS = {
    [MessagePriority.LOW]: 5 * 60 * 1000, // 5 minutes
    [MessagePriority.NORMAL]: 30 * 60 * 1000, // 30 minutes
    [MessagePriority.HIGH]: 2 * 60 * 60 * 1000, // 2 hours
    [MessagePriority.CRITICAL]: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.storageDir = path.join(os.tmpdir(), 'uae-business-setup', 'message-bus', serviceName);
    
    // Ensure storage directory exists
    this.ensureStorageDir();
    
    // Load any persisted critical messages
    this.loadPersistedMessages();
    
    // Start the queue processor
    this.processQueue();
    
    console.log(`[MessageBus] Initialized for service: ${serviceName}`);
  }

  /**
   * Ensure the storage directory exists
   */
  private ensureStorageDir(): void {
    try {
      fs.mkdirSync(this.storageDir, { recursive: true });
    } catch (error) {
      console.error(`[MessageBus] Failed to create storage directory: ${error}`);
    }
  }

  /**
   * Load any persisted critical messages from disk
   */
  private loadPersistedMessages(): void {
    try {
      const files = fs.readdirSync(this.storageDir);
      
      for (const file of files) {
        if (!file.endsWith('.msg')) continue;
        
        try {
          const filePath = path.join(this.storageDir, file);
          const messageJson = fs.readFileSync(filePath, 'utf8');
          const message = JSON.parse(messageJson) as Message;
          
          // Add to queue with a short delay for immediate processing
          this.messageQueue.push({
            message,
            nextAttempt: Date.now() + 100,
            backoffDelay: 1000
          });
          
          // Track the persistent message ID
          this.persistentMessageIds.add(message.id);
          
          console.log(`[MessageBus] Loaded persisted message: ${message.id} for topic ${message.topic}`);
        } catch (error) {
          console.error(`[MessageBus] Failed to load persisted message ${file}: ${error}`);
        }
      }
    } catch (error) {
      console.error(`[MessageBus] Failed to read persisted messages: ${error}`);
    }
  }

  /**
   * Persist a critical message to disk
   */
  private persistMessage(message: Message): void {
    if (message.priority !== MessagePriority.CRITICAL) return;
    
    try {
      const filePath = path.join(this.storageDir, `${message.id}.msg`);
      fs.writeFileSync(filePath, JSON.stringify(message), 'utf8');
      this.persistentMessageIds.add(message.id);
    } catch (error) {
      console.error(`[MessageBus] Failed to persist message ${message.id}: ${error}`);
    }
  }

  /**
   * Remove a persisted message from disk
   */
  private removePersistentMessage(messageId: string): void {
    if (!this.persistentMessageIds.has(messageId)) return;
    
    try {
      const filePath = path.join(this.storageDir, `${messageId}.msg`);
      fs.unlinkSync(filePath);
      this.persistentMessageIds.delete(messageId);
    } catch (error) {
      console.error(`[MessageBus] Failed to remove persisted message ${messageId}: ${error}`);
    }
  }

  /**
   * Process the message queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    
    this.processingQueue = true;
    
    try {
      const now = Date.now();
      
      // Find messages that are ready for processing
      const readyEntries = this.messageQueue.filter(entry => entry.nextAttempt <= now);
      
      // Keep entries that aren't ready yet
      this.messageQueue = this.messageQueue.filter(entry => entry.nextAttempt > now);
      
      // Process ready entries
      for (const entry of readyEntries) {
        await this.processMessage(entry);
      }
    } catch (error) {
      console.error(`[MessageBus] Error processing message queue: ${error}`);
    } finally {
      this.processingQueue = false;
      
      // Schedule next run
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Process a single message from the queue
   */
  private async processMessage(entry: QueueEntry): Promise<void> {
    const { message, backoffDelay } = entry;
    
    // Check if message has expired
    const now = Date.now();
    const messageAge = now - new Date(message.timestamp).getTime();
    
    if (messageAge > message.ttl) {
      console.warn(`[MessageBus] Message ${message.id} for topic ${message.topic} has expired (age: ${messageAge}ms, ttl: ${message.ttl}ms)`);
      
      if (this.persistentMessageIds.has(message.id)) {
        this.removePersistentMessage(message.id);
      }
      
      return;
    }
    
    // Attempt to deliver the message
    try {
      const handlers = this.subscriptions.get(message.topic);
      
      if (!handlers || handlers.size === 0) {
        // If no handlers and we've reached max retries, discard the message
        if (message.attempts >= message.maxRetries) {
          console.warn(`[MessageBus] No handlers for topic ${message.topic} after ${message.attempts} attempts, discarding message ${message.id}`);
          
          if (this.persistentMessageIds.has(message.id)) {
            this.removePersistentMessage(message.id);
          }
          
          return;
        }
        
        // No handlers yet, requeue with backoff
        message.attempts++;
        const newBackoff = Math.min(backoffDelay * 2, 60000); // Max 1 minute backoff
        
        this.messageQueue.push({
          message,
          nextAttempt: now + backoffDelay,
          backoffDelay: newBackoff
        });
        
        console.log(`[MessageBus] No handlers for topic ${message.topic}, requeuing message ${message.id} (attempt ${message.attempts}/${message.maxRetries})`);
        return;
      }
      
      // Deliver to all subscribers
      const deliveryPromises: Promise<void>[] = [];
      
      for (const handler of handlers) {
        try {
          const result = handler(message.data, message);
          
          if (result instanceof Promise) {
            deliveryPromises.push(result);
          }
        } catch (error) {
          console.error(`[MessageBus] Error in handler for topic ${message.topic}: ${error}`);
        }
      }
      
      if (deliveryPromises.length > 0) {
        await Promise.all(deliveryPromises);
      }
      
      // Message delivered successfully
      console.log(`[MessageBus] Successfully delivered message ${message.id} to ${handlers.size} handlers for topic ${message.topic}`);
      
      // If message was persisted, remove it
      if (this.persistentMessageIds.has(message.id)) {
        this.removePersistentMessage(message.id);
      }
    } catch (error) {
      console.error(`[MessageBus] Failed to process message ${message.id} for topic ${message.topic}: ${error}`);
      
      // If we haven't reached max retries, requeue with backoff
      if (message.attempts < message.maxRetries) {
        message.attempts++;
        const newBackoff = Math.min(backoffDelay * 2, 60000); // Max 1 minute backoff
        
        this.messageQueue.push({
          message,
          nextAttempt: now + backoffDelay,
          backoffDelay: newBackoff
        });
        
        console.log(`[MessageBus] Requeuing message ${message.id} for topic ${message.topic} (attempt ${message.attempts}/${message.maxRetries})`);
      } else {
        console.error(`[MessageBus] Giving up on message ${message.id} for topic ${message.topic} after ${message.attempts} attempts`);
        
        if (this.persistentMessageIds.has(message.id)) {
          this.removePersistentMessage(message.id);
        }
      }
    }
  }

  /**
   * Subscribe to a topic
   */
  public subscribe<T = any>(topic: string, handler: MessageHandler<T>): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    
    this.subscriptions.get(topic)!.add(handler as MessageHandler);
    
    console.log(`[MessageBus] Service ${this.serviceName} subscribed to topic ${topic}`);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(topic);
      
      if (handlers) {
        handlers.delete(handler as MessageHandler);
        
        if (handlers.size === 0) {
          this.subscriptions.delete(topic);
        }
      }
    };
  }

  /**
   * Publish a message to a topic
   */
  public publish<T = any>(topic: string, data: T, options: MessageOptions = {}): string {
    const priority = options.priority ?? MessagePriority.NORMAL;
    const ttl = options.ttl ?? MessageBus.DEFAULT_TTLS[priority];
    const maxRetries = options.retries ?? MessageBus.RETRY_COUNTS[priority];
    
    const message: Message<T> = {
      id: crypto.randomUUID(),
      topic,
      data,
      source: this.serviceName,
      timestamp: new Date().toISOString(),
      priority,
      ttl,
      attempts: 0,
      maxRetries,
      idempotencyKey: options.idempotencyKey
    };
    
    // For critical messages, persist to disk
    if (priority === MessagePriority.CRITICAL) {
      this.persistMessage(message);
    }
    
    // Add to queue for immediate processing
    this.messageQueue.push({
      message,
      nextAttempt: Date.now(),
      backoffDelay: 1000
    });
    
    console.log(`[MessageBus] Published message ${message.id} to topic ${topic} with priority ${MessagePriority[priority]}`);
    
    return message.id;
  }

  /**
   * Send a message to all services (broadcast)
   */
  public broadcast<T = any>(topic: string, data: T, options: MessageOptions = {}): string {
    return this.publish(topic, data, options);
  }

  /**
   * Send a request and wait for a response
   */
  public request<TRequest = any, TResponse = any>(
    destination: string,
    topic: string,
    data: TRequest,
    options: MessageOptions = {}
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      const responseTopic = `response.${requestId}`;
      
      // Set up timeout based on TTL
      const timeoutMs = options.ttl ?? MessageBus.DEFAULT_TTLS[options.priority ?? MessagePriority.NORMAL];
      const timeoutId = setTimeout(() => {
        // Remove response handler
        this.requestHandlers.delete(requestId);
        this.subscriptions.delete(responseTopic);
        
        reject(new Error(`Request ${requestId} for ${topic} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      // Store response handler
      this.requestHandlers.set(requestId, (response: TResponse) => {
        clearTimeout(timeoutId);
        this.requestHandlers.delete(requestId);
        resolve(response);
      });
      
      // Listen for response
      this.subscribe(responseTopic, (responseData: TResponse) => {
        const handler = this.requestHandlers.get(requestId);
        
        if (handler) {
          handler(responseData);
          this.subscriptions.delete(responseTopic);
        }
      });
      
      // Send request
      this.publish(`${destination}.${topic}`, {
        ...data,
        _requestId: requestId,
        _replyTo: `${this.serviceName}.${responseTopic}`
      }, options);
    });
  }

  /**
   * Respond to a request
   */
  public respond<TResponse = any>(requestData: any, responseData: TResponse): void {
    if (!requestData._requestId || !requestData._replyTo) {
      console.error(`[MessageBus] Cannot respond to request, missing _requestId or _replyTo`);
      return;
    }
    
    const [destination, topic] = requestData._replyTo.split('.', 2);
    
    this.publish(`${destination}.${topic}`, responseData, {
      priority: MessagePriority.HIGH // Responses are high priority
    });
  }

  /**
   * Shutdown the message bus
   */
  public shutdown(): void {
    console.log(`[MessageBus] Shutting down message bus for service ${this.serviceName}`);
    // Nothing to do for now - in a real implementation, you might want to
    // flush pending messages, close connections, etc.
  }
}

// Factory function to create a message bus instance
export function createMessageBus(serviceName: string): MessageBus {
  return new MessageBus(serviceName);
}

// Export for convenience
export { Message, MessageHandler, ResponseHandler };