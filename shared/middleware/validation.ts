/**
 * Request Validation Middleware
 * 
 * This middleware validates request data against schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Validate request body against a schema
 * @param schema Zod schema to validate against
 */
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate the request body
      const validatedData = schema.parse(req.body);
      
      // Replace the request body with the validated data
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod error to a more user-friendly format
        const validationError = fromZodError(error);
        
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: validationError.details.map(detail => ({
            path: detail.path.join('.'),
            message: detail.message
          }))
        });
      } else {
        // For other types of errors
        res.status(500).json({
          status: 'error',
          message: 'An unexpected error occurred during validation'
        });
      }
    }
  };
}

/**
 * Validate query parameters against a schema
 * @param schema Zod schema to validate against
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate the query parameters
      const validatedData = schema.parse(req.query);
      
      // Replace the query object with the validated data
      req.query = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod error to a more user-friendly format
        const validationError = fromZodError(error);
        
        res.status(400).json({
          status: 'error',
          message: 'Query validation failed',
          errors: validationError.details.map(detail => ({
            path: detail.path.join('.'),
            message: detail.message
          }))
        });
      } else {
        // For other types of errors
        res.status(500).json({
          status: 'error',
          message: 'An unexpected error occurred during validation'
        });
      }
    }
  };
}

/**
 * Validate URL parameters against a schema
 * @param schema Zod schema to validate against
 */
export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate the URL parameters
      const validatedData = schema.parse(req.params);
      
      // Replace the params object with the validated data
      req.params = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod error to a more user-friendly format
        const validationError = fromZodError(error);
        
        res.status(400).json({
          status: 'error',
          message: 'URL parameter validation failed',
          errors: validationError.details.map(detail => ({
            path: detail.path.join('.'),
            message: detail.message
          }))
        });
      } else {
        // For other types of errors
        res.status(500).json({
          status: 'error',
          message: 'An unexpected error occurred during validation'
        });
      }
    }
  };
}