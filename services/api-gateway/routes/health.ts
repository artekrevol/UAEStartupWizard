import express from 'express';
import { checkServiceHealth } from '../middleware/proxy';
import { asyncHandler } from '../../../shared/middleware/errorHandler';

// Create router
const router = express.Router();

/**
 * Simple health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

/**
 * Detailed health check for all services
 */
router.get('/services', asyncHandler(async (req, res) => {
  const healthStatus = await checkServiceHealth();
  
  // Calculate overall status
  const allHealthy = Object.values(healthStatus).every(status => status);
  
  res.json({
    status: allHealthy ? 'ok' : 'degraded',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: healthStatus
  });
}));

export default router;