import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Password strength validator
const passwordSchema = z.string()
  .min(10, "Password must be at least 10 characters")
  .max(100, "Password is too long (maximum 100 characters)")
  .refine(password => /[A-Z]/.test(password), "Password must contain at least one uppercase letter")
  .refine(password => /[a-z]/.test(password), "Password must contain at least one lowercase letter")
  .refine(password => /[0-9]/.test(password), "Password must contain at least one number")
  .refine(password => /[^A-Za-z0-9]/.test(password), "Password must contain at least one special character");

// User registration schema
const userRegisterSchema = z.object({
  username: z.string().min(3).max(50)
    .refine(username => /^[a-zA-Z0-9_-]+$/.test(username), "Username can only contain letters, numbers, underscore, and hyphen"),
  password: passwordSchema,
  company_name: z.string().max(200).optional(),
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
