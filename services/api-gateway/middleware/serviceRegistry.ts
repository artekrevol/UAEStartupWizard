import { eventBus } from '../../../shared/event-bus';

// Service registry to store information about available services
const serviceRegistry: Record<string, {
  host: string;
  port: number;
  healthEndpoint: string;
  routes: Array<{ path: string; methods: string[] }>;
  lastHeartbeat: Date;
  status: 'active' | 'inactive';
}> = {};

// Default service configuration (used for development or when services haven't registered)
const defaultServices = {
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

// Initialize the service registry with default values
export const initServiceRegistry = () => {
  for (const [name, config] of Object.entries(defaultServices)) {
    serviceRegistry[name] = {
      host: config.host,
      port: config.port,
      healthEndpoint: '/health',
      routes: [],
      lastHeartbeat: new Date(),
      status: 'inactive'
    };
  }

  // Listen for service registration events
  eventBus.subscribe('service-registered', (data) => {
    console.log(`[ServiceRegistry] Service registered: ${JSON.stringify(data)}`);
    registerService(
      data.name,
      data.host,
      data.port,
      data.healthEndpoint,
      data.routes
    );
  });

  // Listen for service deregistration events
  eventBus.subscribe('service-deregistered', (data) => {
    console.log(`[ServiceRegistry] Service deregistered: ${JSON.stringify(data)}`);
    deregisterService(data.name);
  });

  // Listen for service health change events
  eventBus.subscribe('service-health-changed', (data) => {
    console.log(`[ServiceRegistry] Service health changed: ${JSON.stringify(data)}`);
    updateServiceStatus(data.name, data.status);
  });
};

// Register a service
export const registerService = (
  name: string,
  host: string,
  port: number,
  healthEndpoint: string = '/health',
  routes: Array<{ path: string; methods: string[] }> = []
) => {
  serviceRegistry[name] = {
    host,
    port,
    healthEndpoint,
    routes,
    lastHeartbeat: new Date(),
    status: 'active'
  };

  console.log(`[ServiceRegistry] Registered service: ${name} at ${host}:${port}`);
};

// Deregister a service
export const deregisterService = (name: string) => {
  if (serviceRegistry[name]) {
    serviceRegistry[name].status = 'inactive';
    console.log(`[ServiceRegistry] Deregistered service: ${name}`);
  }
};

// Update service status
export const updateServiceStatus = (
  name: string,
  status: 'active' | 'inactive'
) => {
  if (serviceRegistry[name]) {
    serviceRegistry[name].status = status;
    serviceRegistry[name].lastHeartbeat = new Date();
  }
};

// Update service heartbeat
export const updateServiceHeartbeat = (name: string) => {
  if (serviceRegistry[name]) {
    serviceRegistry[name].lastHeartbeat = new Date();
  }
};

// Get service URL
export const getServiceURL = (name: string): string => {
  const service = serviceRegistry[name];
  
  if (!service) {
    // If service not found, use default values if available
    const defaultService = defaultServices[name];
    if (defaultService) {
      return `http://${defaultService.host}:${defaultService.port}`;
    }
    
    // Fallback to a default port range starting from 3001
    const serviceIndex = Object.keys(defaultServices).indexOf(name);
    const port = serviceIndex >= 0 ? 3001 + serviceIndex : 3000;
    
    return `http://localhost:${port}`;
  }
  
  return `http://${service.host}:${service.port}`;
};

// Get service port
export const getServicePort = (name: string): number => {
  const service = serviceRegistry[name];
  
  if (!service) {
    // If service not found, use default values if available
    const defaultService = defaultServices[name];
    if (defaultService) {
      return defaultService.port;
    }
    
    // Fallback to a default port range starting from 3001
    const serviceIndex = Object.keys(defaultServices).indexOf(name);
    return serviceIndex >= 0 ? 3001 + serviceIndex : 3000;
  }
  
  return service.port;
};

// Get all registered services
export const getAllServices = () => {
  return serviceRegistry;
};

// Get service by name
export const getService = (name: string) => {
  return serviceRegistry[name];
};

// Check if a service is active
export const isServiceActive = (name: string): boolean => {
  const service = serviceRegistry[name];
  return service ? service.status === 'active' : false;
};

// Clean up inactive services
export const cleanupInactiveServices = () => {
  const now = new Date();
  const inactiveTimeout = 5 * 60 * 1000; // 5 minutes
  
  for (const [name, service] of Object.entries(serviceRegistry)) {
    const timeSinceLastHeartbeat = now.getTime() - service.lastHeartbeat.getTime();
    
    if (timeSinceLastHeartbeat > inactiveTimeout) {
      deregisterService(name);
    }
  }
};