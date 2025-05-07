/**
 * API Gateway Messaging Integration
 * 
 * This module integrates the API Gateway with our messaging system
 * to enable service discovery, health checks, and message routing.
 */

import { initCommunication, MessagePriority } from '../../shared/communication/service-communicator';
import { ServiceRegistry } from './middleware/serviceRegistry';

// Initialize the communicator
const communicator = initCommunication('api-gateway');

/**
 * Initialize messaging for API Gateway
 * @param serviceRegistry The service registry instance
 */
export const initializeMessaging = (serviceRegistry: ServiceRegistry): void => {
  console.log('[API Gateway] Initializing messaging system');
  
  // Handle service registrations
  communicator.onMessage('service.register', (data, message) => {
    console.log(`[API Gateway] Received service registration from ${message.source}:`, data);
    
    try {
      const { name, host, port, healthEndpoint, routes } = data;
      
      // Register the service
      serviceRegistry.register({
        name,
        host,
        port,
        health: healthEndpoint || '/health',
        routes: routes || []
      });
      
      console.log(`[API Gateway] Successfully registered service: ${name}`);
      
      // Send confirmation back to the service
      communicator.sendToService(name, 'service.registered', {
        success: true,
        message: `Service ${name} successfully registered with API Gateway`,
        timestamp: new Date().toISOString()
      });
      
      // Broadcast service availability to other services
      communicator.broadcast('service.available', {
        name,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[API Gateway] Error registering service: ${error instanceof Error ? error.message : String(error)}`);
      
      // Send error back to the service
      communicator.sendToService(message.source, 'service.registration.error', {
        success: false,
        message: `Failed to register service: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      }, { priority: MessagePriority.HIGH });
    }
  });
  
  // Handle service deregistrations
  communicator.onMessage('service.shutdown', (data) => {
    console.log('[API Gateway] Received service shutdown notification:', data);
    
    try {
      const { name } = data;
      
      // Deregister the service
      serviceRegistry.deregister(name);
      
      console.log(`[API Gateway] Successfully deregistered service: ${name}`);
      
      // Broadcast service unavailability to other services
      communicator.broadcast('service.unavailable', {
        name,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[API Gateway] Error deregistering service: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  // Listen for health check requests
  communicator.onMessage('service.health.check.all', (data, message) => {
    console.log('[API Gateway] Received request to check all services health');
    
    // Perform health checks on all registered services
    const services = serviceRegistry.listServices();
    const healthChecks = services.map(service => checkServiceHealth(service.name));
    
    // Wait for all checks to complete
    Promise.all(healthChecks)
      .then(results => {
        // Respond to the requester
        if (message.source && data.requestId) {
          communicator.respond(data, {
            services: results,
            timestamp: new Date().toISOString()
          });
        }
      })
      .catch(error => {
        console.error(`[API Gateway] Error performing health checks: ${error instanceof Error ? error.message : String(error)}`);
        
        if (message.source && data.requestId) {
          communicator.respond(data, null, `Error performing health checks: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
  });
  
  // Listen for service-specific health check requests
  communicator.onMessage('service.health.check', (data) => {
    const { service: serviceName } = data;
    
    if (serviceName && serviceName !== 'all') {
      console.log(`[API Gateway] Received request to check ${serviceName} health`);
      
      // Forward the health check request to the specific service
      communicator.sendToService(serviceName, 'service.health.check', {
        requestId: data.requestId,
        replyTo: data.replyTo || message.source,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Message routing - allow services to send messages to other services through the gateway
  communicator.onMessage('gateway.route.message', (data, message) => {
    const { target, messageType, messageData, priority } = data;
    
    if (!target || !messageType) {
      console.error('[API Gateway] Invalid message routing request: missing target or messageType');
      return;
    }
    
    console.log(`[API Gateway] Routing message from ${message.source} to ${target} with type ${messageType}`);
    
    // Route the message to the target service
    communicator.sendToService(target, messageType, {
      ...messageData,
      _routed: true,
      _source: message.source,
      _gateway: 'api-gateway',
      timestamp: new Date().toISOString()
    }, { priority: priority || MessagePriority.NORMAL });
  });
  
  // Register services with the gateway on startup
  registerGatewayServices();
};

/**
 * Register API Gateway with messaging system and announce its availability
 */
export const registerGatewayServices = (): void => {
  // Announce that the API Gateway is ready
  communicator.broadcast('api-gateway.ready', {
    timestamp: new Date().toISOString()
  }, { priority: MessagePriority.HIGH });
  
  console.log('[API Gateway] Announced readiness to all services');
};

/**
 * Check the health of a specific service
 * @param serviceName The name of the service to check
 */
export const checkServiceHealth = async (serviceName: string): Promise<any> => {
  try {
    console.log(`[API Gateway] Checking health of service: ${serviceName}`);
    
    // Create a promise that will be resolved or rejected based on the response
    return new Promise((resolve, reject) => {
      // Set a timeout for the health check
      const timeout = setTimeout(() => {
        reject(new Error(`Health check timeout for service: ${serviceName}`));
      }, 5000);
      
      // Request ID for tracking the response
      const requestId = `health-check-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Set up a one-time handler for the response
      const responseHandler = (response: any) => {
        if (response.requestId === requestId) {
          clearTimeout(timeout);
          resolve({
            name: serviceName,
            status: response.status || 'unknown',
            uptime: response.uptime,
            timestamp: response.timestamp || new Date().toISOString()
          });
          
          // Remove the handler
          communicator.onMessage(`health-check-response-${requestId}`, null);
        }
      };
      
      // Register a handler for the response
      communicator.onMessage(`health-check-response-${requestId}`, responseHandler);
      
      // Send the health check request
      communicator.sendToService(serviceName, 'service.health.check', {
        requestId,
        replyTo: 'api-gateway',
        timestamp: new Date().toISOString()
      }, { priority: MessagePriority.HIGH });
    });
  } catch (error) {
    console.error(`[API Gateway] Error checking health of service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      name: serviceName,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Gracefully shut down the messaging system
 */
export const shutdownMessaging = (): void => {
  console.log('[API Gateway] Shutting down messaging system');
  
  // Announce gateway shutdown
  communicator.broadcast('api-gateway.shutdown', {
    timestamp: new Date().toISOString()
  }, { priority: MessagePriority.CRITICAL });
  
  // Disconnect from the message bus
  communicator.disconnect();
};