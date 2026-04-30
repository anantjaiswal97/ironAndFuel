import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { isProduction } from '../config/env.js';

// Custom error class - throw these in services/controllers when something
// is the user's fault (bad input, not found, etc) instead of a server bug.
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Catches all errors thrown in async route handlers.
 * Express's default error handler is bad - it leaks stack traces.
 * This one logs server errors but never exposes internals to the client.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Known/expected errors - return their status and message
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }

  // Mongoose validation error (e.g. required field missing, regex mismatch)
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: 'Validation failed', details: err.message });
    return;
  }

  // MongoDB duplicate key (e.g. signup with existing email)
  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }

  // Unexpected error - log full details server-side, send generic message to client
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    ...(isProduction ? {} : { message: err.message, stack: err.stack }),
  });
}

/**
 * Wrapper for async route handlers. Catches rejected promises and passes
 * them to errorHandler. Without this, async errors crash the server.
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
