import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// User registration schema
const userRegisterSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  company_name: z.string().optional(),
  role: z.enum(['user', 'admin']).optional().default('user'),
});

// Login schema
const userLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

/**
 * Middleware to validate registration requests
 */
export function validateRegister(req: Request, res: Response, next: NextFunction) {
  try {
    userRegisterSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    next(error);
  }
}

/**
 * Middleware to validate login requests
 */
export function validateLogin(req: Request, res: Response, next: NextFunction) {
  try {
    userLoginSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    next(error);
  }
}

/**
 * Create a validator middleware for any Zod schema
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      next(error);
    }
  };
}
