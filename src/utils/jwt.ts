import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

// What we put inside the JWT. Keep this small - JWTs are sent on every
// request. Just user ID is enough; we look up the rest from DB if needed.
export interface JwtPayload {
  userId: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  // Throws on invalid/expired token. Caller should catch.
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  return decoded;
}
