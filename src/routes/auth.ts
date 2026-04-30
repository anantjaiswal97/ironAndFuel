import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  signupController,
  loginController,
  meController,
  updateProfileController,
  signupSchema,
  loginSchema,
  updateProfileSchema,
} from '../controllers/authController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Strict rate limit on auth endpoints to prevent brute-force attacks.
// 5 attempts per 15 minutes per IP. After that, requests get 429.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/signup', authLimiter, validateBody(signupSchema), asyncHandler(signupController));
router.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(loginController));
router.get('/me', requireAuth, asyncHandler(meController));
router.patch(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  asyncHandler(updateProfileController)
);

export default router;
