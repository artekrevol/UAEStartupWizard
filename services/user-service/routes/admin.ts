/**
 * Admin Routes
 * 
 * Routes for administrative operations on users
 * All routes require admin or superadmin authentication
 */
import { Router } from 'express';
import adminController from '../controllers/adminController';
import { requireRole } from '../../../shared/middleware/authenticateJwt';

const router = Router();

// Admin-only access
router.use(requireRole(['admin', 'superadmin']));

// User management
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Role and status management
router.post('/users/:id/role', requireRole('superadmin'), adminController.changeUserRole);
router.post('/users/:id/status', adminController.changeUserStatus);

// Monitoring and auditing
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/stats', adminController.getSystemStats);

export default router;