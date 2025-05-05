/**
 * User Management Service - Handles authentication and user profile management
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { errorHandlerMiddleware, ServiceException, ErrorCode } from '../../shared/errors';
import { createEventBus, EventType, createEvent } from '../../shared/event-bus';
import { UserRole } from '../../shared/types';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
const db = drizzle(pool);

// Initialize event bus
const eventBus = createEventBus();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts, please try again later.'
});

// Define routes

// Authentication routes
app.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Email and password are required'
      );
    }
    
    // In production, query the database for the user
    // const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    // Mock user for demonstration
    const mockUser = {
      id: 1,
      email: 'admin@example.com',
      username: 'admin',
      password: await bcrypt.hash('password123', 10),
      role: UserRole.ADMIN,
      createdAt: new Date()
    };
    
    // Check if user exists and password matches
    if (email !== mockUser.email || !(await bcrypt.compare(password, mockUser.password))) {
      throw new ServiceException(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    }
    
    // Create JWT token
    const token = jwt.sign(
      { 
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role 
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '1h' }
    );
    
    // Return user info and token
    res.json({
      user: {
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        role: mockUser.role
      },
      token
    });
    
  } catch (error) {
    next(error);
  }
});

app.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, name } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      throw new ServiceException(
        ErrorCode.VALIDATION_ERROR,
        'Username, email, and password are required'
      );
    }
    
    // In production, check if user exists and create new user in database
    // const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    // if (existingUser.length) { throw new ServiceException(...); }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user (mock)
    const newUser = {
      id: Math.floor(Math.random() * 1000),
      username,
      email,
      password: hashedPassword,
      name,
      role: UserRole.USER,
      createdAt: new Date()
    };
    
    // Publish user created event
    await eventBus.publish(createEvent(EventType.USER_CREATED, {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    }));
    
    // Return success
    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    });
    
  } catch (error) {
    next(error);
  }
});

// User management routes (protected)
app.get('/users', async (req, res, next) => {
  try {
    // In production, fetch users from database
    // const users = await db.select().from(users);
    
    // Mock response
    res.json([
      { id: 1, username: 'admin', email: 'admin@example.com', role: UserRole.ADMIN },
      { id: 2, username: 'user1', email: 'user1@example.com', role: UserRole.USER }
    ]);
  } catch (error) {
    next(error);
  }
});

app.get('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    
    // In production, fetch user from database
    // const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    // Mock response
    if (userId === 1) {
      res.json({ id: 1, username: 'admin', email: 'admin@example.com', role: UserRole.ADMIN });
    } else if (userId === 2) {
      res.json({ id: 2, username: 'user1', email: 'user1@example.com', role: UserRole.USER });
    } else {
      throw new ServiceException(
        ErrorCode.USER_NOT_FOUND,
        `User with ID ${userId} not found`
      );
    }
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use(errorHandlerMiddleware);

// Start server
app.listen(PORT, () => {
  console.log(`[User Service] Server running on port ${PORT}`);
});
