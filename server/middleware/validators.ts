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
  email: z.string().email("Please enter a valid email address"),
  password: passwordSchema,
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  company_name: z.string().max(200).optional(),
  terms_accepted: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
  role: z.enum(['user', 'premium_user', 'admin', 'super_admin']).optional().default('user'),
});

// Login schema
const userLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string(),
  remember_me: z.boolean().optional().default(false),
});

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Password reset schema
export const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
  password_confirmation: z.string().min(1, "Password confirmation is required"),
}).refine(data => data.password === data.password_confirmation, {
  message: "Passwords do not match",
  path: ["password_confirmation"]
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
