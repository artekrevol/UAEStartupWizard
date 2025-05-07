import express from 'express';
import axios from 'axios';

export const router = express.Router();

// Keep track of registered services
const registeredServices: Record<string, {
  host: string;
  port: number;
  healthEndpoint: string;
  lastHeartbeat: Date;
  status: 'healthy' | 'degraded' | 'unhealthy';
}> = {};

// Register a service
export const registerService = (
  name: string,
  host: string,
  port: number,
  healthEndpoint: string = '/health'
) => {
  registeredServices[name] = {
    host,
    port,
    healthEndpoint,
    lastHeartbeat: new Date(),
    status: 'healthy'
  };
};

// Deregister a service
export const deregisterService = (name: string) => {
  delete registeredServices[name];
};

// Update service status
export const updateServiceStatus = (
  name: string,
  status: 'healthy' | 'degraded' | 'unhealthy'
) => {
  if (registeredServices[name]) {
    registeredServices[name].status = status;
    registeredServices[name].lastHeartbeat = new Date();
  }
};

// Check service health
const checkServiceHealth = async (name: string) => {
  const service = registeredServices[name];
  if (!service) return false;

  try {
    const url = `http://${service.host}:${service.port}${service.healthEndpoint}`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.status === 200) {
      updateServiceStatus(name, 'healthy');
      return true;
    } else {
      updateServiceStatus(name, 'degraded');
      return false;
    }
  } catch (error) {
    updateServiceStatus(name, 'unhealthy');
    return false;
  }
};

// Default health check endpoint
router.get('/', async (req, res) => {
  // Run health checks on all registered services
  const healthChecks: Record<string, any> = {};
  let overallStatus = 'healthy';

  for (const [name, service] of Object.entries(registeredServices)) {
    const isHealthy = await checkServiceHealth(name);
    
    healthChecks[name] = {
      status: service.status,
      lastHeartbeat: service.lastHeartbeat
    };

    if (service.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (service.status === 'degraded' && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  }

  // Respond with overall health status
  res.json({
    status: overallStatus,
    services: healthChecks,
    gateway: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

// Service-specific health check endpoint
router.get('/:service', async (req, res) => {
  const { service } = req.params;
  
  if (!registeredServices[service]) {
    return res.status(404).json({
      status: 'error',
      message: `Service '${service}' not found`
    });
  }

  const isHealthy = await checkServiceHealth(service);
  
  res.json({
    service,
    status: registeredServices[service].status,
    lastHeartbeat: registeredServices[service].lastHeartbeat,
    timestamp: new Date().toISOString()
  });
});

// Register initial test services (for development only - in production these would be registered dynamically)
if (process.env.NODE_ENV === 'development') {
  registerService('user-service', 'localhost', 3001);
  registerService('document-service', 'localhost', 3002);
  registerService('freezone-service', 'localhost', 3003);
}