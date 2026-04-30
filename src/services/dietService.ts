import { DietEntry, IDietEntry } from '../models/DietEntry.js';
import { AppError } from '../middleware/errorHandler.js';
import { Types } from 'mongoose';

interface CreateDietEntryInput {
  userId: string;
  date: string;
  name: string;
  calories: number;
  protein?: number;
  fiber?: number;
  vitamins?: string;
  source?: 'ai' | 'manual' | 'recipe';
}

export async function createEntry(input: CreateDietEntryInput): Promise<IDietEntry> {
  return DietEntry.create({
    ...input,
    userId: new Types.ObjectId(input.userId),
  });
}

export async function listEntriesForDate(userId: string, date: string): Promise<IDietEntry[]> {
  return DietEntry.find({ userId, date }).sort({ loggedAt: 1 });
}

export async function listEntriesInRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<IDietEntry[]> {
  return DietEntry.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1, loggedAt: 1 });
}

export async function deleteEntry(userId: string, entryId: string): Promise<void> {
  // Critical security check: ensure the entry belongs to the requesting user.
  // Without this, user A could delete user B's entries by guessing IDs.
  const result = await DietEntry.deleteOne({
    _id: new Types.ObjectId(entryId),
    userId: new Types.ObjectId(userId),
  });
  if (result.deletedCount === 0) {
    throw new AppError(404, 'Entry not found');
  }
}
