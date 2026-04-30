import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Generic request body validator using Zod schemas.
 * Returns 400 with field-level errors if validation fails.
 *
 * Usage: router.post('/login', validateBody(loginSchema), loginController)
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    // Replace req.body with the parsed (and type-safe!) data
    req.body = result.data;
    next();
  };
}
