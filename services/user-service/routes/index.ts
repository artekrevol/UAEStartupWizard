/**
 * User Service Routes
 */
import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';

const router = Router();

// Use authentication routes
router.use('/auth', authRoutes);

// Use user routes
router.use('/users', userRoutes);

export default router;