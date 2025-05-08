/**
 * Async Handler Middleware
 * 
 * A utility function to wrap async route handlers
 * Eliminates the need for try/catch blocks in each route handler
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async function and forwards any errors to the next middleware
 * @param fn Async function to wrap
 * @returns Express middleware function
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};