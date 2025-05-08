/**
 * Service Registry Client
 * 
 * Manages service registration, deregistration, and heartbeats with the service registry
 */
import axios from 'axios';
import { logger } from './logger';

export class ServiceRegistry {
  private serviceName: string;
  private servicePort: number;
  private registryHost: string;
  private registryPort: number;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatDelay: number = 30000; // 30 seconds

  /**
   * Initialize the service registry client
   * 
   * @param serviceName Name of the service to register
   * @param servicePort Port the service is running on
   * @param registryHost Host of the service registry
   * @param registryPort Port of the service registry
   * @param heartbeatDelay Delay between heartbeats in milliseconds (default: 30000)
   */
  constructor(
    serviceName: string,
    servicePort: number,
    registryHost: string,
    registryPort: number,
    heartbeatDelay: number = 30000
  ) {
    this.serviceName = serviceName;
    this.servicePort = servicePort;
    this.registryHost = registryHost;
    this.registryPort = registryPort;
    this.heartbeatDelay = heartbeatDelay;
  }

  /**
   * Register the service with the registry
   */
  async register(): Promise<void> {
    try {
      const registryUrl = `http://${this.registryHost}:${this.registryPort}/services`;
      
      logger.info(`Registering service ${this.serviceName} with registry`, {
        service: this.serviceName,
        registryUrl
      });
      
      await axios.post(registryUrl, {
        name: this.serviceName,
        port: this.servicePort,
        host: process.env.SERVICE_HOST || 'localhost',
        health: `/health`
      });
      
      // Start sending heartbeats
      this.startHeartbeat();
      
      logger.info(`Service ${this.serviceName} registered successfully`, {
        service: this.serviceName
      });
    } catch (error) {
      logger.error(`Failed to register service ${this.serviceName}`, {
        service: this.serviceName,
        error: error.message
      });
      
      // Try again in 10 seconds if we couldn't register
      setTimeout(() => this.register(), 10000);
    }
  }

  /**
   * Deregister the service from the registry
   */
  async deregister(): Promise<void> {
    try {
      // Stop the heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      const registryUrl = `http://${this.registryHost}:${this.registryPort}/services/${this.serviceName}`;
      
      logger.info(`Deregistering service ${this.serviceName} from registry`, {
        service: this.serviceName,
        registryUrl
      });
      
      await axios.delete(registryUrl);
      
      logger.info(`Service ${this.serviceName} deregistered successfully`, {
        service: this.serviceName
      });
    } catch (error) {
      logger.error(`Failed to deregister service ${this.serviceName}`, {
        service: this.serviceName,
        error: error.message
      });
    }
  }

  /**
   * Start sending heartbeat signals to the registry
   */
  private startHeartbeat(): void {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Set up new heartbeat interval
    this.heartbeatInterval = setInterval(async () => {
      try {
        const registryUrl = `http://${this.registryHost}:${this.registryPort}/services/${this.serviceName}/heartbeat`;
        
        await axios.put(registryUrl);
        
        logger.debug(`Sent heartbeat for service ${this.serviceName}`, {
          service: this.serviceName
        });
      } catch (error) {
        logger.warn(`Failed to send heartbeat for service ${this.serviceName}`, {
          service: this.serviceName,
          error: error.message
        });
        
        // If we can't send heartbeats, try to register again
        this.register();
      }
    }, this.heartbeatDelay);
  }

  /**
   * Discover a service from the registry
   * 
   * @param serviceName Name of the service to discover
   * @returns Service information or null if not found
   */
  async discover(serviceName: string): Promise<{ host: string; port: number } | null> {
    try {
      const registryUrl = `http://${this.registryHost}:${this.registryPort}/services/${serviceName}`;
      
      const response = await axios.get(registryUrl);
      
      if (response.data && response.data.host && response.data.port) {
        return {
          host: response.data.host,
          port: response.data.port
        };
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to discover service ${serviceName}`, {
        service: this.serviceName,
        error: error.message
      });
      
      return null;
    }
  }

  /**
   * List all registered services
   * 
   * @returns Array of registered services or empty array if none found
   */
  async listServices(): Promise<Array<{ name: string; host: string; port: number }>> {
    try {
      const registryUrl = `http://${this.registryHost}:${this.registryPort}/services`;
      
      const response = await axios.get(registryUrl);
      
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      logger.error('Failed to list services', {
        service: this.serviceName,
        error: error.message
      });
      
      return [];
    }
  }
}