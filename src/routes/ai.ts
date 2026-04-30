import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import * as aiService from '../services/aiService.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// AI endpoints are expensive (call out to Gemini, Gemini has free quota).
// 30 calls per hour per user is generous for personal use, prevents abuse.
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req: Request): string => req.userId ?? req.ip ?? 'unknown',
  message: { error: 'AI rate limit reached. Try again in an hour.' },
});

const estimateSchema = z.object({
  description: z.string().min(2).max(500),
});

const recipesSchema = z.object({
  existing: z.array(z.string()).max(50),
});

const workoutSummarySchema = z.object({
  date: z.string().min(8).max(20),
  bodyWeightKg: z.number().min(20).max(300),
  calorieEstimate: z.number().min(0).max(5000),
  durationMinutes: z.number().min(1).max(300),
  exercises: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        sets: z.number().int().min(1).max(20),
        reps: z.number().int().min(1).max(200).nullable(),
        time: z.number().int().min(1).max(3600).nullable(),
        weight: z.number().min(0).max(200),
        restSec: z.number().int().min(0).max(600),
      }),
    )
    .min(1)
    .max(50),
});

async function estimateController(req: Request, res: Response): Promise<void> {
  const result = await aiService.estimateNutrition(req.body.description);
  res.json({ result });
}

async function recipesController(req: Request, res: Response): Promise<void> {
  const recipes = await aiService.generateRecipes(req.body.existing);
  res.json({ recipes });
}

async function workoutSummaryController(req: Request, res: Response): Promise<void> {
  const summary = await aiService.summarizeWorkoutPlan(req.body);
  res.json({ summary });
}

const router = Router();
router.use(requireAuth);
router.use(aiLimiter);

router.post('/estimate-nutrition', validateBody(estimateSchema), asyncHandler(estimateController));
router.post('/generate-recipes', validateBody(recipesSchema), asyncHandler(recipesController));
router.post('/workout-summary', validateBody(workoutSummarySchema), asyncHandler(workoutSummaryController));

export default router;
