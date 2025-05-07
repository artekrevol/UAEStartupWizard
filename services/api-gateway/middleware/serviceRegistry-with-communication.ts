/**
 * Service Registry with Enhanced Communication
 * 
 * This module provides service discovery and registration functionality
 * using the shared messaging system for reliable communication.
 */

import { getCommunicator, MessagePriority } from '../../../shared/communication/service-communicator';

// Get the communicator
const communicator = getCommunicator('api-gateway');

// Service interface definition
export interface Service {
  name: string;
  host: string;
  port: number;
  health: string;
  routes: Array<{ path: string; methods: string[] }>;
  lastHeartbeat: Date;
  status: 'active' | 'inactive';
}

// Create a service registry class
export class ServiceRegistry {
  private services: Map<string, Service> = new Map();
  private defaultServices: Record<string, { host: string; port: number }> = {
    'user-service': {
      host: process.env.USER_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.USER_SERVICE_PORT || '3001', 10)
    },
    'document-service': {
      host: process.env.DOCUMENT_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.DOCUMENT_SERVICE_PORT || '3002', 10)
    },
    'freezone-service': {
      host: process.env.FREEZONE_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.FREEZONE_SERVICE_PORT || '3003', 10)
    },
    'scraper-service': {
      host: process.env.SCRAPER_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.SCRAPER_SERVICE_PORT || '3004', 10)
    }
  };

  constructor() {
    this.initializeDefaultServices();
  }

  /**
   * Initialize the registry with default service configurations
   */
  private initializeDefaultServices(): void {
    for (const [name, config] of Object.entries(this.defaultServices)) {
      this.services.set(name, {
        name,
        host: config.host,
        port: config.port,
        health: '/health',
        routes: [],
        lastHeartbeat: new Date(),
        status: 'inactive'
      });
    }

    console.log('[ServiceRegistry] Initialized with default services');
  }

  /**
   * Register a service in the registry
   */
  public register(service: Omit<Service, 'lastHeartbeat' | 'status'>): void {
    this.services.set(service.name, {
      ...service,
      lastHeartbeat: new Date(),
      status: 'active'
    });

    console.log(`[ServiceRegistry] Registered service: ${service.name} at ${service.host}:${service.port}`);

    // Broadcast service availability to other services
    communicator.broadcast('service.available', {
      name: service.name,
      host: service.host,
      port: service.port,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Deregister a service from the registry
   */
  public deregister(name: string): void {
    const service = this.services.get(name);
    
    if (service) {
      service.status = 'inactive';
      this.services.set(name, service);
      
      console.log(`[ServiceRegistry] Deregistered service: ${name}`);
      
      // Broadcast service unavailability to other services
      communicator.broadcast('service.unavailable', {
        name,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Update a service's status
   */
  public updateStatus(name: string, status: 'active' | 'inactive'): void {
    const service = this.services.get(name);
    
    if (service) {
      service.status = status;
      service.lastHeartbeat = new Date();
      this.services.set(name, service);
      
      console.log(`[ServiceRegistry] Updated service ${name} status to ${status}`);
    }
  }

  /**
   * Update a service's last heartbeat time
   */
  public updateHeartbeat(name: string): void {
    const service = this.services.get(name);
    
    if (service) {
      service.lastHeartbeat = new Date();
      this.services.set(name, service);
    }
  }

  /**
   * Get a service URL (http://host:port)
   */
  public getServiceURL(name: string): string {
    const service = this.services.get(name);
    
    if (!service || service.status !== 'active') {
      // If service not found or inactive, use default values if available
      const defaultService = this.defaultServices[name];
      
      if (defaultService) {
        return `http://${defaultService.host}:${defaultService.port}`;
      }
      
      // Fallback to a default port range starting from 3001
      const serviceIndex = Object.keys(this.defaultServices).indexOf(name);
      const port = serviceIndex >= 0 ? 3001 + serviceIndex : 3000;
      
      return `http://localhost:${port}`;
    }
    
    return `http://${service.host}:${service.port}`;
  }

  /**
   * Get a service's port
   */
  public getServicePort(name: string): number {
    const service = this.services.get(name);
    
    if (!service || service.status !== 'active') {
      // If service not found or inactive, use default values if available
      const defaultService = this.defaultServices[name];
      
      if (defaultService) {
        return defaultService.port;
      }
      
      // Fallback to a default port range starting from 3001
      const serviceIndex = Object.keys(this.defaultServices).indexOf(name);
      return serviceIndex >= 0 ? 3001 + serviceIndex : 3000;
    }
    
    return service.port;
  }

  /**
   * Check if a service is active
   */
  public isActive(name: string): boolean {
    const service = this.services.get(name);
    return service ? service.status === 'active' : false;
  }

  /**
   * List all services (active or inactive)
   */
  public listServices(): Service[] {
    return Array.from(this.services.values());
  }

  /**
   * List only active services
   */
  public listActiveServices(): Service[] {
    return Array.from(this.services.values()).filter(service => service.status === 'active');
  }

  /**
   * Get a specific service by name
   */
  public getService(name: string): Service | undefined {
    return this.services.get(name);
  }

  /**
   * Clean up inactive services
   */
  public cleanupInactiveServices(): void {
    const now = new Date();
    const inactiveTimeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [name, service] of this.services.entries()) {
      const timeSinceLastHeartbeat = now.getTime() - service.lastHeartbeat.getTime();
      
      if (service.status === 'active' && timeSinceLastHeartbeat > inactiveTimeout) {
        console.log(`[ServiceRegistry] Service ${name} hasn't sent a heartbeat in ${timeSinceLastHeartbeat / 1000}s, marking as inactive`);
        this.deregister(name);
      }
    }
  }
}

// Create a singleton instance
export const serviceRegistry = new ServiceRegistry();

// Backward compatibility functions
export const initServiceRegistry = (): void => {
  // This is a no-op since the registry is now initialized when imported
  console.log('[ServiceRegistry] Service registry already initialized');
};

export const registerService = (
  name: string,
  host: string,
  port: number,
  health: string = '/health',
  routes: Array<{ path: string; methods: string[] }> = []
): void => {
  serviceRegistry.register({ name, host, port, health, routes });
};

export const deregisterService = (name: string): void => {
  serviceRegistry.deregister(name);
};

export const updateServiceStatus = (
  name: string,
  status: 'active' | 'inactive'
): void => {
  serviceRegistry.updateStatus(name, status);
};

export const updateServiceHeartbeat = (name: string): void => {
  serviceRegistry.updateHeartbeat(name);
};

export const getServiceURL = (name: string): string => {
  return serviceRegistry.getServiceURL(name);
};

export const getServicePort = (name: string): number => {
  return serviceRegistry.getServicePort(name);
};

export const getAllServices = (): Record<string, Service> => {
  const services: Record<string, Service> = {};
  serviceRegistry.listServices().forEach(service => {
    services[service.name] = service;
  });
  return services;
};

export const getService = (name: string): Service | undefined => {
  return serviceRegistry.getService(name);
};

export const isServiceActive = (name: string): boolean => {
  return serviceRegistry.isActive(name);
};

export const cleanupInactiveServices = (): void => {
  serviceRegistry.cleanupInactiveServices();
};