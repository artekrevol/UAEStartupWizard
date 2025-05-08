/**
 * Admin Routes
 * 
 * Handles administrative operations for user management
 * Only accessible to users with admin or superadmin roles
 */
import express from 'express';
import { AdminController } from '../controllers/adminController';
import { requireRole } from '../../../shared/middleware/authenticateJwt';

const router = express.Router();
const adminController = new AdminController();

// User management
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Superadmin-only operations
router.use(requireRole('superadmin'));
router.patch('/users/:id/role', adminController.changeUserRole);
router.patch('/users/:id/status', adminController.changeUserStatus);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/stats', adminController.getSystemStats);

export default router;