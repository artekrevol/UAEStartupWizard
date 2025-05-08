import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '../../shared/config';
import { logger } from '../../shared/logger';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { notFoundHandler } from '../../shared/middleware/notFoundHandler';
import { ServiceRegistry } from '../../shared/service-registry';
import { eventBus } from '../../shared/event-bus';
import { DocumentEventHandler } from './events/documentEventHandler';
import userRoutes from './routes';

// Initialize Express app
const app = express();

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply routes
app.use('/api/users', userRoutes);

// Apply error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize document event handler to listen for document events
const documentEventHandler = new DocumentEventHandler(eventBus);

// Register service with service registry
const serviceRegistry = new ServiceRegistry();
serviceRegistry.register('user-service', {
  name: 'user-service',
  baseUrl: `http://localhost:${config.userService.port}`,
  routes: [
    { path: '/api/users', methods: ['GET', 'POST'] },
    { path: '/api/users/:id', methods: ['GET', 'PATCH', 'DELETE'] },
    { path: '/api/users/:id/documents', methods: ['GET'] },
    { path: '/api/auth/login', methods: ['POST'] },
    { path: '/api/auth/register', methods: ['POST'] },
    { path: '/api/auth/verify', methods: ['POST'] },
    { path: '/api/auth/refresh', methods: ['POST'] },
    { path: '/api/profile', methods: ['GET', 'PATCH'] }
  ],
  status: 'healthy',
  version: '1.0.0'
});

// Start heartbeat to update service status
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
setInterval(() => {
  serviceRegistry.updateStatus('user-service', 'healthy');
}, HEARTBEAT_INTERVAL);

// Start server
const PORT = config.userService.port || 3001;
app.listen(PORT, () => {
  logger.info(`[UserService] Server running on port ${PORT}`);
});

// Handle shutdown
process.on('SIGINT', () => {
  logger.info('[UserService] Shutting down gracefully');
  serviceRegistry.deregister('user-service');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('[UserService] Shutting down gracefully');
  serviceRegistry.deregister('user-service');
  process.exit(0);
});

// Export instance for testing
export { app };