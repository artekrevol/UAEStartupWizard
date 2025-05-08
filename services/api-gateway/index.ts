/**
 * API Gateway Service
 * 
 * This service is the entry point for all client requests
 * It routes requests to appropriate microservices
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { createHttpTerminator } from 'http-terminator';
import setupProxies from './routes';
import setupAuthRoutes from './auth-routes';
import setupAdminRoutes from './admin-routes';
import { rateLimiter } from '../../shared/middleware/security';
import setupPerformanceMiddleware from '../../shared/middleware/performance-fixed';
import { ServiceCommunicator } from '../../shared/communication/service-communicator';
import { setupWebSocketServer } from './websocket-server';

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(rateLimiter);

// Performance middleware
setupPerformanceMiddleware(app);

// Setup service communicator
const serviceCommunicator = new ServiceCommunicator('api-gateway');

// Setup routes
setupAuthRoutes(app, serviceCommunicator);
setupAdminRoutes(app, serviceCommunicator);
const server = setupProxies(app, serviceCommunicator);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

// Setup WebSocket server for real-time communication
setupWebSocketServer(server, serviceCommunicator);

// Handle graceful shutdown
const httpTerminator = createHttpTerminator({ server });

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down API Gateway gracefully');
  await httpTerminator.terminate();
  serviceCommunicator.shutdown();
  process.exit(0);
});

export default server;