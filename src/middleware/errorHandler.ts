import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error types from Technical Architecture v2.0 Gap 6
export const ErrorTypes = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND_ERROR: 404,
  CONFLICT_ERROR: 409,
  SERVER_ERROR: 500,
};

// Global error handler
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Default to 500 server error
  let statusCode = 500;
  let message = 'Internal server error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      statusCode = ErrorTypes.CONFLICT_ERROR;
      message = 'A record with this information already exists';
    } else if (prismaError.code === 'P2025') {
      statusCode = ErrorTypes.NOT_FOUND_ERROR;
      message = 'Record not found';
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    statusCode = ErrorTypes.VALIDATION_ERROR;
    message = 'Validation failed';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: getErrorCode(statusCode),
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

// Get error code string
function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'AUTHENTICATION_ERROR';
    case 403:
      return 'AUTHORIZATION_ERROR';
    case 404:
      return 'NOT_FOUND_ERROR';
    case 409:
      return 'CONFLICT_ERROR';
    default:
      return 'SERVER_ERROR';
  }
}

// Async handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
