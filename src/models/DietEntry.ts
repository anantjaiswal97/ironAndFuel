import { Schema, model, Document, Types } from 'mongoose';

export interface IDietEntry extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: string; // YYYY-MM-DD - day this entry belongs to
  name: string;
  calories: number;
  protein: number;
  fiber: number;
  vitamins: string;
  loggedAt: Date;
  source: 'ai' | 'manual' | 'recipe';
}

const dietEntrySchema = new Schema<IDietEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // queries always filter by userId
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/, // strict YYYY-MM-DD
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    calories: { type: Number, required: true, min: 0, max: 10000 },
    protein: { type: Number, required: true, min: 0, max: 500, default: 0 },
    fiber: { type: Number, required: true, min: 0, max: 200, default: 0 },
    vitamins: { type: String, default: '', maxlength: 500 },
    loggedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['ai', 'manual', 'recipe'], default: 'manual' },
  },
  { timestamps: true }
);

// Compound index: queries for "give me all diet entries for user X on date Y"
// run in O(log n) instead of scanning the whole collection. This is the
// single most-called query in the app, so the index is essential.
dietEntrySchema.index({ userId: 1, date: 1 });

export const DietEntry = model<IDietEntry>('DietEntry', dietEntrySchema);
