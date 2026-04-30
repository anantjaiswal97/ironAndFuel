import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as dietService from '../services/dietService.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const createEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  name: z.string().min(1).max(200),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(500).optional(),
  fiber: z.number().min(0).max(200).optional(),
  vitamins: z.string().max(500).optional(),
  source: z.enum(['ai', 'manual', 'recipe']).optional(),
});

async function createEntryController(req: Request, res: Response): Promise<void> {
  const entry = await dietService.createEntry({
    userId: req.userId!, // requireAuth guarantees this
    ...req.body,
  });
  res.status(201).json({ entry });
}

async function listForDateController(req: Request, res: Response): Promise<void> {
  const date = String(req.params.date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Date must be YYYY-MM-DD' });
    return;
  }
  const entries = await dietService.listEntriesForDate(req.userId!, date);
  res.json({ entries });
}

async function listInRangeController(req: Request, res: Response): Promise<void> {
  const start = String(req.query.start ?? '');
  const end = String(req.query.end ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    res.status(400).json({ error: 'start and end query params required (YYYY-MM-DD)' });
    return;
  }
  const entries = await dietService.listEntriesInRange(req.userId!, start, end);
  res.json({ entries });
}

async function deleteEntryController(req: Request, res: Response): Promise<void> {
  await dietService.deleteEntry(req.userId!, String(req.params.id ?? ''));
  res.status(204).end();
}

const router = Router();
router.use(requireAuth); // ALL diet routes require auth

router.post('/', validateBody(createEntrySchema), asyncHandler(createEntryController));
router.get('/range', asyncHandler(listInRangeController));
router.get('/:date', asyncHandler(listForDateController));
router.delete('/:id', asyncHandler(deleteEntryController));

export default router;
