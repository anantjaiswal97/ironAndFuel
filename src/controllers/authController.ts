import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService.js';
import { User } from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

export const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1),
});

export async function signupController(req: Request, res: Response): Promise<void> {
  const { user, token } = await authService.signup(req.body);
  res.status(201).json({ user, token });
}

export async function loginController(req: Request, res: Response): Promise<void> {
  const { user, token } = await authService.login(req.body);
  res.json({ user, token });
}

export async function meController(req: Request, res: Response): Promise<void> {
  // req.userId is set by requireAuth middleware
  const user = await User.findById(req.userId);
  if (!user) throw new AppError(404, 'User not found');
  res.json({ user });
}

const profileUpdateSchema = z.object({
  weight: z.number().min(20).max(300).optional(),
  calorieGoal: z.number().min(800).max(6000).optional(),
  proteinGoal: z.number().min(20).max(500).optional(),
  fiberGoal: z.number().min(5).max(100).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  profile: profileUpdateSchema.optional(),
});

export async function updateProfileController(req: Request, res: Response): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (req.body.name) updates.name = req.body.name;
  if (req.body.profile) {
    Object.entries(req.body.profile).forEach(([key, value]) => {
      updates[`profile.${key}`] = value;
    });
  }

  const user = await User.findByIdAndUpdate(req.userId, updates, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new AppError(404, 'User not found');
  res.json({ user });
}
