/**
 * Not Found Handler Middleware
 * Handles 404 errors for all services
 */
import { Request, Response, NextFunction } from 'express';
import { ServiceException, ErrorCode } from '../errors';

/**
 * Middleware to handle 404 errors
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new ServiceException(
    ErrorCode.NOT_FOUND,
    `Resource not found: ${req.method} ${req.path}`,
    { path: req.path, method: req.method },
    404
  );
  
  next(error);
};