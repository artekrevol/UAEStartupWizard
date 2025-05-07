import express from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import freezoneRoutes from './freezone';
import documentRoutes from './document';
import adminRoutes from './admin';
import { router as healthRoutes } from './health';

const router = express.Router();

// Health check routes
router.use('/health', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', userRoutes);

// Freezone routes
router.use('/freezones', freezoneRoutes);

// Document routes
router.use('/documents', documentRoutes);

// Admin routes
router.use('/admin', adminRoutes);

export default router;