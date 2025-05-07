/**
 * Simple Message Bus for Inter-Service Communication
 * 
 * This module provides reliable message passing between microservices with:
 * - Guaranteed message delivery with retries
 * - Error handling for failed message delivery
 * - Message persistence for critical messages
 * - Event-based communication patterns
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// Directory to store persistent messages
const STORAGE_DIR = path.join(process.cwd(), 'message_storage');

// Message priority levels
export enum MessagePriority {
  LOW = 'low',       // Non-critical messages, best-effort delivery
  NORMAL = 'normal', // Standard messages, retry a few times
  HIGH = 'high',     // Important messages, retry many times
  CRITICAL = 'critical' // Critical messages, persist to disk, retry until delivered
}

// Message status
export enum MessageStatus {
  PENDING = 'pending',   // Message waiting to be processed
  DELIVERED = 'delivered', // Message delivered successfully
  FAILED = 'failed',    // Message delivery failed
  RETRYING = 'retrying'  // Message delivery being retried
}

// Message type definition
export interface Message {
  id: string;           // Unique message ID
  topic: string;        // Message topic/channel
  data: any;            // Message payload
  source: string;       // Source service name
  target?: string;      // Target service name (optional)
  priority: MessagePriority; // Message priority
  timestamp: string;    // Message creation timestamp
  status: MessageStatus; // Current message status
  retries?: number;     // Number of delivery attempts
  maxRetries?: number;  // Maximum retry attempts
  error?: string;       // Error message if delivery failed
}

// Subscriber type definition
type Subscriber = {
  id: string;              // Subscriber ID
  serviceName: string;     // Service name
  callback: (message: Message) => Promise<void> | void; // Callback function
  topics: string[];        // List of topics to subscribe to
  active: boolean;         // Whether subscriber is active
  lastSeen?: string;       // Last seen timestamp
};

// Message Bus class
export class MessageBus {
  private static instance: MessageBus;
  private subscribers: Map<string, Subscriber> = new Map();
  private pendingMessages: Message[] = [];
  private messageHistory: Map<string, Message> = new Map();
  private serviceName: string;
  private isProcessingQueue: boolean = false;
  private persistToDisk: boolean = true;
  
  // Create a singleton instance
  public static getInstance(serviceName: string): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus(serviceName);
    }
    return MessageBus.instance;
  }
  
  private constructor(serviceName: string) {
    this.serviceName = serviceName;
    
    // Create storage directory if it doesn't exist
    if (this.persistToDisk && !fs.existsSync(STORAGE_DIR)) {
      try {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      } catch (error) {
        console.error(`[MessageBus] Error creating storage directory: ${error}`);
        this.persistToDisk = false;
      }
    }
    
    // Load any persisted messages
    this.loadPersistedMessages();
    
    // Process the message queue every second
    setInterval(() => this.processMessageQueue(), 1000);
    
    // Log heartbeat every 30 seconds
    setInterval(() => {
      console.log(`[MessageBus:${this.serviceName}] Heartbeat - Active subscribers: ${this.getActiveSubscribersCount()}, Pending messages: ${this.pendingMessages.length}`);
      this.cleanupMessageHistory();
    }, 30000);
    
    console.log(`[MessageBus:${this.serviceName}] Initialized message bus`);
  }
  
  /**
   * Subscribe to messages on specific topics
   */
  public subscribe(
    topics: string | string[],
    callback: (message: Message) => Promise<void> | void,
    serviceName: string = this.serviceName
  ): string {
    const id = uuidv4();
    const topicsArray = Array.isArray(topics) ? topics : [topics];
    
    this.subscribers.set(id, {
      id,
      serviceName,
      callback,
      topics: topicsArray,
      active: true,
      lastSeen: new Date().toISOString()
    });
    
    console.log(`[MessageBus:${this.serviceName}] Service '${serviceName}' subscribed to topics: ${topicsArray.join(', ')}`);
    return id;
  }
  
  /**
   * Unsubscribe from receiving messages
   */
  public unsubscribe(subscriberId: string): boolean {
    const subscriber = this.subscribers.get(subscriberId);
    
    if (subscriber) {
      subscriber.active = false;
      console.log(`[MessageBus:${this.serviceName}] Unsubscribed ${subscriber.serviceName} from ${subscriber.topics.join(', ')}`);
      return true;
    }
    
    console.warn(`[MessageBus:${this.serviceName}] Subscriber ${subscriberId} not found for unsubscribe`);
    return false;
  }
  
  /**
   * Publish a message to subscribers
   */
  public publish(
    topic: string,
    data: any,
    options: {
      priority?: MessagePriority,
      target?: string,
      maxRetries?: number
    } = {}
  ): string {
    const {
      priority = MessagePriority.NORMAL,
      target,
      maxRetries = priority === MessagePriority.CRITICAL ? 100 :
                  priority === MessagePriority.HIGH ? 10 :
                  priority === MessagePriority.NORMAL ? 3 : 1
    } = options;
    
    const message: Message = {
      id: uuidv4(),
      topic,
      data,
      source: this.serviceName,
      target,
      priority,
      timestamp: new Date().toISOString(),
      status: MessageStatus.PENDING,
      retries: 0,
      maxRetries
    };
    
    // Add message to pending queue
    this.pendingMessages.push(message);
    
    // Persist critical messages to disk
    if (priority === MessagePriority.CRITICAL && this.persistToDisk) {
      this.persistMessage(message);
    }
    
    // Store in message history
    this.messageHistory.set(message.id, message);
    
    console.log(`[MessageBus:${this.serviceName}] Published message to topic '${topic}' with ID ${message.id}`);
    
    // Trigger immediate processing if not already processing
    if (!this.isProcessingQueue) {
      this.processMessageQueue();
    }
    
    return message.id;
  }
  
  /**
   * Get the status of a message
   */
  public getMessageStatus(messageId: string): MessageStatus | undefined {
    const message = this.messageHistory.get(messageId);
    return message?.status;
  }
  
  /**
   * Process the pending message queue
   */
  private async processMessageQueue() {
    if (this.isProcessingQueue || this.pendingMessages.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      // Create a copy of the queue to work with
      const messagesToProcess = [...this.pendingMessages];
      
      // Clear the queue first to prevent re-processing
      this.pendingMessages = [];
      
      for (const message of messagesToProcess) {
        await this.deliverMessage(message);
      }
    } catch (error) {
      console.error(`[MessageBus:${this.serviceName}] Error processing message queue: ${error}`);
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  /**
   * Deliver a message to subscribers
   */
  private async deliverMessage(message: Message): Promise<void> {
    let deliveredToAny = false;
    const matchingSubscribers = Array.from(this.subscribers.values()).filter(
      subscriber => 
        subscriber.active &&
        subscriber.topics.some(topic => 
          topic === message.topic || 
          topic === '*' || 
          (topic.endsWith('*') && message.topic.startsWith(topic.slice(0, -1)))
        ) &&
        (!message.target || message.target === subscriber.serviceName)
    );
    
    if (matchingSubscribers.length === 0) {
      // No subscribers, check if we should retry later
      if (message.retries < message.maxRetries) {
        message.retries++;
        message.status = MessageStatus.RETRYING;
        this.pendingMessages.push(message);
        
        if (message.retries > 3) {
          console.warn(`[MessageBus:${this.serviceName}] No subscribers for topic '${message.topic}', retry ${message.retries}/${message.maxRetries}`);
        }
      } else {
        message.status = MessageStatus.FAILED;
        message.error = 'No subscribers available after max retries';
        console.error(`[MessageBus:${this.serviceName}] Failed to deliver message ${message.id} to topic '${message.topic}': No subscribers after ${message.retries} retries`);
        
        // For critical messages, keep trying
        if (message.priority === MessagePriority.CRITICAL) {
          setTimeout(() => {
            message.retries = 0;
            this.pendingMessages.push(message);
          }, 60000); // Try again in a minute
        }
      }
      
      return;
    }
    
    // Attempt delivery to each subscriber
    for (const subscriber of matchingSubscribers) {
      try {
        await Promise.resolve(subscriber.callback(message));
        subscriber.lastSeen = new Date().toISOString();
        deliveredToAny = true;
      } catch (error) {
        console.error(`[MessageBus:${this.serviceName}] Error delivering message ${message.id} to subscriber ${subscriber.serviceName}: ${error}`);
      }
    }
    
    // Update message status based on delivery success
    if (deliveredToAny) {
      message.status = MessageStatus.DELIVERED;
      // Update message history
      this.messageHistory.set(message.id, message);
      
      // Remove persisted message if it was critical
      if (message.priority === MessagePriority.CRITICAL && this.persistToDisk) {
        this.removePersistedMessage(message.id);
      }
    } else {
      // No successful deliveries, retry if attempts remain
      if (message.retries < message.maxRetries) {
        message.retries++;
        message.status = MessageStatus.RETRYING;
        
        // Add back to queue with exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, message.retries - 1), 60000); // Max 1 minute
        setTimeout(() => {
          this.pendingMessages.push(message);
        }, delay);
        
        console.warn(`[MessageBus:${this.serviceName}] Retrying message ${message.id} delivery, attempt ${message.retries}/${message.maxRetries} in ${delay}ms`);
      } else {
        message.status = MessageStatus.FAILED;
        message.error = 'All delivery attempts failed';
        console.error(`[MessageBus:${this.serviceName}] Failed to deliver message ${message.id} after ${message.maxRetries} attempts`);
        
        // For critical messages, keep trying with a delay
        if (message.priority === MessagePriority.CRITICAL) {
          setTimeout(() => {
            message.retries = 0;
            this.pendingMessages.push(message);
          }, 60000); // Try again in a minute
        }
      }
    }
  }
  
  /**
   * Persist a message to disk for durability
   */
  private persistMessage(message: Message): void {
    if (!this.persistToDisk) return;
    
    try {
      const filePath = path.join(STORAGE_DIR, `${message.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(message, null, 2));
    } catch (error) {
      console.error(`[MessageBus:${this.serviceName}] Failed to persist message ${message.id}: ${error}`);
    }
  }
  
  /**
   * Remove a persisted message from disk
   */
  private removePersistedMessage(messageId: string): void {
    if (!this.persistToDisk) return;
    
    try {
      const filePath = path.join(STORAGE_DIR, `${messageId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`[MessageBus:${this.serviceName}] Failed to remove persisted message ${messageId}: ${error}`);
    }
  }
  
  /**
   * Load persisted messages from disk
   */
  private loadPersistedMessages(): void {
    if (!this.persistToDisk) return;
    
    try {
      if (fs.existsSync(STORAGE_DIR)) {
        const files = fs.readdirSync(STORAGE_DIR);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const filePath = path.join(STORAGE_DIR, file);
              const content = fs.readFileSync(filePath, 'utf8');
              const message = JSON.parse(content) as Message;
              
              // Reset status to pending for reprocessing
              message.status = MessageStatus.PENDING;
              message.retries = 0;
              
              this.pendingMessages.push(message);
              this.messageHistory.set(message.id, message);
              
              console.log(`[MessageBus:${this.serviceName}] Loaded persisted message ${message.id}`);
            } catch (readError) {
              console.error(`[MessageBus:${this.serviceName}] Error loading persisted message ${file}: ${readError}`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`[MessageBus:${this.serviceName}] Failed to load persisted messages: ${error}`);
    }
  }
  
  /**
   * Clean up old message history entries
   */
  private cleanupMessageHistory(): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    for (const [id, message] of this.messageHistory.entries()) {
      const messageDate = new Date(message.timestamp);
      
      // Keep failed messages for debugging
      if (message.status !== MessageStatus.FAILED && messageDate < oneDayAgo) {
        this.messageHistory.delete(id);
      }
    }
  }
  
  /**
   * Get count of active subscribers
   */
  private getActiveSubscribersCount(): number {
    return Array.from(this.subscribers.values()).filter(sub => sub.active).length;
  }
  
  /**
   * Get the service name
   */
  public getServiceName(): string {
    return this.serviceName;
  }
}

// Export a simplified interface for ease of use
export const createMessageBus = (serviceName: string): {
  subscribe: (topics: string | string[], callback: (message: Message) => Promise<void> | void, serviceName?: string) => string;
  unsubscribe: (subscriberId: string) => boolean;
  publish: (topic: string, data: any, options?: { priority?: MessagePriority; target?: string; maxRetries?: number }) => string;
  getMessageStatus: (messageId: string) => MessageStatus | undefined;
  getServiceName: () => string;
} => {
  const instance = MessageBus.getInstance(serviceName);
  
  return {
    subscribe: (topics, callback, serviceName) => instance.subscribe(topics, callback, serviceName),
    unsubscribe: (subscriberId) => instance.unsubscribe(subscriberId),
    publish: (topic, data, options) => instance.publish(topic, data, options),
    getMessageStatus: (messageId) => instance.getMessageStatus(messageId),
    getServiceName: () => instance.getServiceName()
  };
};