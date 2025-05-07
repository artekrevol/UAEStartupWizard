import express from 'express';
import { standardRateLimiter } from '../middleware/rateLimiter';
import healthRoutes from './health';
import { createServiceProxy } from '../middleware/proxy';
import { optionalAuthenticateJWT } from '../middleware/auth';

// Create router
const router = express.Router();

// Apply default middleware for all routes
router.use(optionalAuthenticateJWT);
router.use(standardRateLimiter);

// Health check routes
router.use('/health', healthRoutes);

// Service proxy for all other routes
router.use('/', createServiceProxy());

export default router;