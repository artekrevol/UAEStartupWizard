/**
 * Service Registry
 * Central registry for service discovery and health monitoring
 */
import { logger } from './logger';

// Types for service registration
interface Route {
  path: string;
  methods: string[];
}

interface ServiceInfo {
  name: string;
  baseUrl: string;
  routes: Route[];
  status: 'healthy' | 'unhealthy' | 'starting';
  version: string;
  lastHeartbeat?: number;
}

/**
 * Registry for microservices in the system
 */
export class ServiceRegistry {
  private services: Map<string, ServiceInfo>;
  
  constructor() {
    this.services = new Map();
    logger.info('[ServiceRegistry] Service registry initialized');
  }
  
  /**
   * Register a service with the registry
   */
  register(serviceId: string, info: ServiceInfo): void {
    info.lastHeartbeat = Date.now();
    this.services.set(serviceId, info);
    logger.info(`[ServiceRegistry] Service registered: ${serviceId}`);
  }
  
  /**
   * Deregister a service from the registry
   */
  deregister(serviceId: string): void {
    if (this.services.has(serviceId)) {
      this.services.delete(serviceId);
      logger.info(`[ServiceRegistry] Service deregistered: ${serviceId}`);
    }
  }
  
  /**
   * Update the status of a service
   */
  updateStatus(serviceId: string, status: 'healthy' | 'unhealthy' | 'starting'): void {
    const service = this.services.get(serviceId);
    
    if (service) {
      service.status = status;
      service.lastHeartbeat = Date.now();
      this.services.set(serviceId, service);
      logger.debug(`[ServiceRegistry] Service status updated: ${serviceId} -> ${status}`);
    }
  }
  
  /**
   * Get information about a service
   */
  getServiceInfo(serviceId: string): ServiceInfo | undefined {
    return this.services.get(serviceId);
  }
  
  /**
   * Get the URL for a service
   */
  getServiceURL(serviceId: string): string {
    const service = this.services.get(serviceId);
    
    if (!service) {
      logger.warn(`[ServiceRegistry] Service not found: ${serviceId}`);
      throw new Error(`Service not found: ${serviceId}`);
    }
    
    return service.baseUrl;
  }
  
  /**
   * Check if a service is healthy
   */
  isServiceHealthy(serviceId: string): boolean {
    const service = this.services.get(serviceId);
    
    if (!service) {
      return false;
    }
    
    // Check if the last heartbeat was recent (within last 60 seconds)
    const heartbeatAge = Date.now() - (service.lastHeartbeat || 0);
    const isRecent = heartbeatAge < 60000; // 60 seconds
    
    return service.status === 'healthy' && isRecent;
  }
  
  /**
   * Get all registered services
   */
  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }
}