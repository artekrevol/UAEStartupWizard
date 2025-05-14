/**
 * Service Communicator
 * 
 * A simplified API for microservices to communicate with each other using the message bus.
 * This module provides service-oriented abstractions over the raw message bus.
 */

import { createMessageBus, MessageBus, MessageHandler, MessageOptions, MessagePriority } from './message-bus';

// Global registry of message bus instances by service name
const messageBusRegistry: Map<string, MessageBus> = new Map();

// Default options for different message types
const DEFAULT_OPTIONS: Record<string, MessageOptions> = {
  'service.register': { priority: MessagePriority.HIGH },
  'service.health': { priority: MessagePriority.HIGH },
  'system.alert': { priority: MessagePriority.CRITICAL },
  'default': { priority: MessagePriority.NORMAL }
};

/**
 * Service Communicator interface
 */
export interface ServiceCommunicator {
  // Basic operations
  sendToService<T = any>(destination: string, topic: string, data: T, options?: MessageOptions): string;
  broadcast<T = any>(topic: string, data: T, options?: MessageOptions): string;
  onMessage<T = any>(topic: string, handler: (data: T, message: any) => void | Promise<void>): () => void;
  
  // Request-response pattern
  request<TRequest = any, TResponse = any>(
    destination: string, 
    topic: string, 
    data: TRequest, 
    options?: MessageOptions
  ): Promise<TResponse>;
  respond<TResponse = any>(requestData: any, responseData: TResponse): void;
  
  // Service operations
  registerWithGateway(serviceInfo: ServiceInfo): Promise<RegistrationResponse>;
  checkServiceHealth(serviceName: string): Promise<HealthStatus>;
  broadcastServiceStatus(status: 'up' | 'down' | 'degraded', details?: any): void;
  
  // Internal operations
  getMessageBus(): MessageBus;
  shutdown(): void;
}

/**
 * Service information for registration
 */
export interface ServiceInfo {
  name: string;
  host: string;
  port: number;
  healthEndpoint?: string;
  routes?: Array<{ path: string; methods: string[] }>;
  version?: string;
  capabilities?: string[];
}

/**
 * Registration response
 */
export interface RegistrationResponse {
  success: boolean;
  message: string;
  timestamp: string;
  services?: string[];
}

/**
 * Health status response
 */
export interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  timestamp: string;
  details?: any;
}

/**
 * Implementation of the Service Communicator
 */
class ServiceCommunicatorImpl implements ServiceCommunicator {
  private serviceName: string;
  private messageBus: MessageBus;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
    
    // Get or create a message bus for this service
    if (!messageBusRegistry.has(serviceName)) {
      messageBusRegistry.set(serviceName, createMessageBus(serviceName));
    }
    
    this.messageBus = messageBusRegistry.get(serviceName)!;
  }

  /**
   * Send a message to a specific service
   */
  public sendToService<T = any>(destination: string, topic: string, data: T, options?: MessageOptions): string {
    const fullTopic = `${destination}.${topic}`;
    return this.messageBus.publish(fullTopic, data, this.mergeOptions(topic, options));
  }

  /**
   * Broadcast a message to all services
   */
  public broadcast<T = any>(topic: string, data: T, options?: MessageOptions): string {
    return this.messageBus.broadcast(topic, {
      ...data,
      _sender: this.serviceName,
      _timestamp: new Date().toISOString()
    }, this.mergeOptions(topic, options));
  }

  /**
   * Listen for messages on a specific topic
   */
  public onMessage<T = any>(topic: string, handler: (data: T, message: any) => void | Promise<void>): () => void {
    // Try to handle both scoped and non-scoped topics
    const unsubscribeFull = this.messageBus.subscribe(`${this.serviceName}.${topic}`, handler as MessageHandler);
    const unsubscribeSimple = this.messageBus.subscribe(topic, handler as MessageHandler);
    
    // Return a function that unsubscribes from both
    return () => {
      unsubscribeFull();
      unsubscribeSimple();
    };
  }

  /**
   * Send a request and wait for a response
   */
  public request<TRequest = any, TResponse = any>(
    destination: string, 
    topic: string, 
    data: TRequest, 
    options?: MessageOptions
  ): Promise<TResponse> {
    return this.messageBus.request(destination, topic, data, this.mergeOptions(topic, options));
  }

  /**
   * Respond to a request
   */
  public respond<TResponse = any>(requestData: any, responseData: TResponse): void {
    this.messageBus.respond(requestData, responseData);
  }

  /**
   * Register this service with the API Gateway
   */
  public registerWithGateway(serviceInfo: ServiceInfo): Promise<RegistrationResponse> {
    return new Promise((resolve, reject) => {
      // Set up listener for registration response
      const responseTopic = `service.${this.serviceName}.registered`;
      const unsubscribe = this.messageBus.subscribe(responseTopic, (data: RegistrationResponse) => {
        unsubscribe();
        resolve(data);
      });
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Registration with API Gateway timed out after 5000ms`));
      }, 5000);
      
      // Send registration message
      this.sendToService('api-gateway', 'service.register', {
        ...serviceInfo,
        timestamp: new Date().toISOString()
      }, { priority: MessagePriority.HIGH });
    });
  }

  /**
   * Check the health of another service
   */
  public checkServiceHealth(serviceName: string): Promise<HealthStatus> {
    return this.request(serviceName, 'service.health.check', {
      requesterId: this.serviceName,
      timestamp: new Date().toISOString()
    }, { priority: MessagePriority.HIGH });
  }

  /**
   * Broadcast the status of this service
   */
  public broadcastServiceStatus(status: 'up' | 'down' | 'degraded', details?: any): void {
    this.broadcast('service.status', {
      service: this.serviceName,
      status,
      timestamp: new Date().toISOString(),
      details
    }, { priority: MessagePriority.HIGH });
  }

  /**
   * Get the underlying message bus
   */
  public getMessageBus(): MessageBus {
    return this.messageBus;
  }

  /**
   * Shutdown the communicator
   */
  public shutdown(): void {
    this.messageBus.shutdown();
  }

  /**
   * Merge default options with provided options based on topic
   */
  private mergeOptions(topic: string, options?: MessageOptions): MessageOptions {
    const defaultOpts = DEFAULT_OPTIONS[topic] || DEFAULT_OPTIONS.default;
    return { ...defaultOpts, ...options };
  }
}

/**
 * Factory function to get a service communicator
 */
export function getCommunicator(serviceName: string): ServiceCommunicator {
  return new ServiceCommunicatorImpl(serviceName);
}

// Re-export MessagePriority enum for convenience
export { MessagePriority };