import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { logger } from '../config/logger.js';

// Extend Express's Request type so TypeScript knows req.userId exists
// after this middleware runs.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Protects routes. Requires Authorization: Bearer <token> header.
 * On success, attaches req.userId. On failure, returns 401.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = header.slice(7); // strip "Bearer "
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch (err) {
    // Don't leak whether the token was malformed vs expired vs forged -
    // attackers shouldn't get hints. Just say "unauthorized".
    logger.debug({ err }, 'Auth middleware rejected request');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
