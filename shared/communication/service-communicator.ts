/**
 * Service Communicator
 * 
 * A simplified interface for service-to-service communication
 * that handles common communication patterns and provides
 * a more friendly API for microservices.
 */

import { createMessageBus, Message, MessagePriority, MessageStatus } from './message-bus';

export {
  Message,
  MessagePriority,
  MessageStatus
};

export class ServiceCommunicator {
  private messageBus;
  private serviceName: string;
  private subscriberIds: string[] = [];
  private messageHandlers: Map<string, (data: any, message: Message) => Promise<void> | void> = new Map();
  private isConnected: boolean = false;
  
  /**
   * Create a new ServiceCommunicator instance for a specific service
   */
  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.messageBus = createMessageBus(serviceName);
    
    // Listen for service discovery messages
    this.setupServiceDiscovery();
    
    console.log(`[ServiceCommunicator] Created communicator for service: ${serviceName}`);
  }
  
  /**
   * Initialize communication with other services
   */
  public connect(): void {
    if (this.isConnected) {
      console.log(`[ServiceCommunicator:${this.serviceName}] Already connected`);
      return;
    }
    
    // Subscribe to direct messages for this service
    const directSubscriberId = this.messageBus.subscribe(
      `service.${this.serviceName}`,
      this.handleMessage.bind(this)
    );
    this.subscriberIds.push(directSubscriberId);
    
    // Subscribe to broadcast messages
    const broadcastSubscriberId = this.messageBus.subscribe(
      'broadcast.*',
      this.handleMessage.bind(this)
    );
    this.subscriberIds.push(broadcastSubscriberId);
    
    this.isConnected = true;
    
    // Announce this service's availability
    this.messageBus.publish('service.discovery', {
      action: 'register',
      serviceName: this.serviceName,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[ServiceCommunicator:${this.serviceName}] Connected and listening for messages`);
  }
  
  /**
   * Disconnect and cleanup
   */
  public disconnect(): void {
    if (!this.isConnected) {
      return;
    }
    
    // Unsubscribe from all topics
    for (const subscriberId of this.subscriberIds) {
      this.messageBus.unsubscribe(subscriberId);
    }
    this.subscriberIds = [];
    
    // Announce service is going offline
    this.messageBus.publish('service.discovery', {
      action: 'unregister',
      serviceName: this.serviceName,
      timestamp: new Date().toISOString()
    });
    
    this.isConnected = false;
    
    console.log(`[ServiceCommunicator:${this.serviceName}] Disconnected`);
  }
  
  /**
   * Register a handler for a specific message type
   */
  public onMessage(
    messageType: string,
    handler: (data: any, message: Message) => Promise<void> | void
  ): void {
    this.messageHandlers.set(messageType, handler);
    console.log(`[ServiceCommunicator:${this.serviceName}] Registered handler for message type: ${messageType}`);
  }
  
  /**
   * Send a message to a specific service
   */
  public sendToService(
    targetService: string,
    messageType: string,
    data: any,
    options: { priority?: MessagePriority } = {}
  ): string {
    if (!this.isConnected) {
      throw new Error(`Cannot send message: ${this.serviceName} is not connected`);
    }
    
    const topic = `service.${targetService}`;
    const messageId = this.messageBus.publish(topic, {
      type: messageType,
      data,
      timestamp: new Date().toISOString()
    }, {
      target: targetService,
      priority: options.priority || MessagePriority.NORMAL
    });
    
    return messageId;
  }
  
  /**
   * Send a message to all services (broadcast)
   */
  public broadcast(
    messageType: string,
    data: any,
    options: { priority?: MessagePriority } = {}
  ): string {
    if (!this.isConnected) {
      throw new Error(`Cannot broadcast message: ${this.serviceName} is not connected`);
    }
    
    const topic = `broadcast.${messageType}`;
    const messageId = this.messageBus.publish(topic, {
      type: messageType,
      data,
      timestamp: new Date().toISOString()
    }, {
      priority: options.priority || MessagePriority.NORMAL
    });
    
    return messageId;
  }
  
  /**
   * Send a message and wait for a response (request-response pattern)
   */
  public async request(
    targetService: string,
    messageType: string,
    data: any,
    options: { 
      priority?: MessagePriority,
      timeoutMs?: number
    } = {}
  ): Promise<any> {
    if (!this.isConnected) {
      throw new Error(`Cannot send request: ${this.serviceName} is not connected`);
    }
    
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const responsePromise = new Promise<any>((resolve, reject) => {
      // Create a response handler
      const responseHandler = (responseData: any, message: Message) => {
        if (responseData.requestId === requestId) {
          // Remove temporary handler after getting response
          this.messageHandlers.delete(`response.${requestId}`);
          
          if (responseData.error) {
            reject(new Error(responseData.error));
          } else {
            resolve(responseData.data);
          }
        }
      };
      
      // Register temporary handler for this request
      this.onMessage(`response.${requestId}`, responseHandler);
      
      // Set timeout
      const timeoutMs = options.timeoutMs || 30000; // Default 30 seconds
      setTimeout(() => {
        // Check if handler still exists (response not received)
        if (this.messageHandlers.has(`response.${requestId}`)) {
          this.messageHandlers.delete(`response.${requestId}`);
          reject(new Error(`Request to ${targetService} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });
    
    // Send the request
    this.sendToService(targetService, messageType, {
      ...data,
      requestId,
      replyTo: this.serviceName
    }, {
      priority: options.priority || MessagePriority.HIGH
    });
    
    return responsePromise;
  }
  
  /**
   * Send a response to a request
   */
  public respond(
    requestData: any,
    responseData: any,
    error?: string
  ): void {
    if (!this.isConnected) {
      throw new Error(`Cannot send response: ${this.serviceName} is not connected`);
    }
    
    const { requestId, replyTo } = requestData;
    
    if (!requestId || !replyTo) {
      throw new Error('Cannot respond: Invalid request data (missing requestId or replyTo)');
    }
    
    this.sendToService(replyTo, `response.${requestId}`, {
      requestId,
      data: responseData,
      error,
      timestamp: new Date().toISOString()
    }, {
      priority: MessagePriority.HIGH
    });
  }
  
  /**
   * Get status of a sent message
   */
  public getMessageStatus(messageId: string): MessageStatus | undefined {
    return this.messageBus.getMessageStatus(messageId);
  }
  
  /**
   * Handle incoming messages
   */
  private handleMessage(message: Message): void {
    const payload = message.data;
    
    if (!payload || typeof payload !== 'object' || !payload.type) {
      console.warn(`[ServiceCommunicator:${this.serviceName}] Received malformed message:`, message);
      return;
    }
    
    const messageType = payload.type;
    const handler = this.messageHandlers.get(messageType);
    
    if (handler) {
      try {
        handler(payload.data, message);
      } catch (error) {
        console.error(`[ServiceCommunicator:${this.serviceName}] Error handling message ${messageType}:`, error);
      }
    } else {
      console.debug(`[ServiceCommunicator:${this.serviceName}] No handler for message type: ${messageType}`);
    }
  }
  
  /**
   * Setup service discovery
   */
  private setupServiceDiscovery(): void {
    const discoverySubscriberId = this.messageBus.subscribe('service.discovery', (message: Message) => {
      const data = message.data;
      
      if (data.action === 'register' && data.serviceName !== this.serviceName) {
        // A new service has come online
        console.log(`[ServiceCommunicator:${this.serviceName}] Discovered service: ${data.serviceName}`);
        
        // If we're already connected, announce ourselves to the new service
        if (this.isConnected) {
          this.messageBus.publish('service.discovery', {
            action: 'register',
            serviceName: this.serviceName,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
    
    this.subscriberIds.push(discoverySubscriberId);
  }
}

// Create a default instance for the module
let defaultInstance: ServiceCommunicator | null = null;

/**
 * Get a ServiceCommunicator instance
 */
export function getCommunicator(serviceName?: string): ServiceCommunicator {
  if (!serviceName && !defaultInstance) {
    throw new Error('No default ServiceCommunicator available. Please provide a serviceName.');
  }
  
  if (serviceName) {
    return new ServiceCommunicator(serviceName);
  }
  
  return defaultInstance!;
}

/**
 * Create and initialize a default ServiceCommunicator
 */
export function initCommunication(serviceName: string): ServiceCommunicator {
  if (defaultInstance) {
    defaultInstance.disconnect();
  }
  
  defaultInstance = new ServiceCommunicator(serviceName);
  defaultInstance.connect();
  
  return defaultInstance;
}