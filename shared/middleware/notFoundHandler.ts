/**
 * Not Found Middleware
 * Handles requests for resources that don't exist
 */
import { Request, Response, NextFunction } from 'express';
import { ServiceException, ErrorCode } from '../errors';

/**
 * Handler for routes that don't exist
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ServiceException(
    ErrorCode.NOT_FOUND,
    `Resource not found: ${req.method} ${req.originalUrl}`
  );
  
  next(error);
};