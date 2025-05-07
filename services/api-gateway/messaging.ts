/**
 * API Gateway Messaging Integration
 * 
 * Connects the API Gateway to the shared messaging system and handles
 * communication with microservices.
 */

import { getCommunicator, MessagePriority } from '../../shared/communication/service-communicator';
import { serviceRegistry } from './middleware/serviceRegistry-with-communication';

// Get communicator for API Gateway
const communicator = getCommunicator('api-gateway');

/**
 * Initialize the messaging system and set up event handlers
 */
export function initializeMessaging(registry: any): void {
  // Set up service registration handlers
  communicator.onMessage('service.register', (data, message) => {
    console.log(`[API Gateway] Service registration request from ${message.source || 'unknown'}: ${JSON.stringify(data)}`);
    
    // Register the service in the registry
    registry.register({
      name: data.name,
      host: data.host,
      port: data.port,
      health: data.healthEndpoint || '/health',
      routes: data.routes || []
    });
    
    // Send acknowledgment back to the service
    communicator.sendToService(data.name, 'service.registered', {
      success: true,
      message: `Service ${data.name} registered successfully`,
      timestamp: new Date().toISOString(),
      services: registry.listActiveServices().map((s: any) => s.name)
    }, { priority: MessagePriority.HIGH });
    
    // Broadcast to all services that a new service is available
    communicator.broadcast('service.available', {
      name: data.name,
      host: data.host,
      port: data.port,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle service deregistration
  communicator.onMessage('service.deregister', (data, message) => {
    console.log(`[API Gateway] Service deregistration request from ${message.source}: ${JSON.stringify(data)}`);
    
    // Deregister the service
    registry.deregister(data.name || message.source);
    
    // Broadcast to all services that a service is no longer available
    communicator.broadcast('service.unavailable', {
      name: data.name || message.source,
      timestamp: new Date().toISOString()
    });
  });
  
  // Handle service health checks
  communicator.onMessage('service.health.check', (data, message) => {
    console.log(`[API Gateway] Health check request from ${message.source}`);
    
    // Respond with API Gateway health status
    communicator.respond(data, {
      service: 'api-gateway',
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: registry.listActiveServices().map((s: any) => ({
        name: s.name,
        status: s.status,
        lastHeartbeat: s.lastHeartbeat
      }))
    });
  });
  
  // Handle service heartbeats
  communicator.onMessage('service.heartbeat', (data, message) => {
    if (!message.source) return;
    
    console.log(`[API Gateway] Heartbeat from ${message.source}`);
    registry.updateHeartbeat(message.source);
    registry.updateStatus(message.source, 'active');
  });
  
  // Listen for service status changes
  communicator.onMessage('service.status', (data, message) => {
    if (!message.source || !data.status) return;
    
    console.log(`[API Gateway] Status update from ${message.source}: ${data.status}`);
    
    const statusMapping: Record<string, 'active' | 'inactive'> = {
      'up': 'active',
      'down': 'inactive',
      'degraded': 'active' // Still active but with issues
    };
    
    if (statusMapping[data.status]) {
      registry.updateStatus(message.source, statusMapping[data.status]);
    }
    
    // Broadcast the status change to all services
    communicator.broadcast('service.status.changed', {
      service: message.source,
      status: data.status,
      timestamp: new Date().toISOString(),
      details: data.details
    });
  });

  console.log('[API Gateway] Messaging system initialized');
}

/**
 * Register the API Gateway's own services and announce readiness
 */
export function registerGatewayServices(): void {
  // Announce that the API Gateway is ready
  // This will trigger services to register with the gateway
  communicator.broadcast('api-gateway.ready', {
    timestamp: new Date().toISOString(),
    version: process.env.API_GATEWAY_VERSION || '1.0.0'
  }, { priority: MessagePriority.HIGH });
  
  console.log('[API Gateway] Announced readiness');
}

/**
 * Gracefully shutdown the messaging system
 */
export function shutdownMessaging(): void {
  // Announce shutdown to all services
  try {
    communicator.broadcast('api-gateway.shutdown', {
      reason: 'shutdown',
      timestamp: new Date().toISOString()
    }, { priority: MessagePriority.CRITICAL });
    
    console.log('[API Gateway] Shutdown announced');
    
    // Give a little time for the message to be delivered
    setTimeout(() => {
      (communicator as any).shutdown();
    }, 500);
  } catch (error) {
    console.error('[API Gateway] Error during messaging shutdown:', error);
  }
}