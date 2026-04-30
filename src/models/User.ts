import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// The shape of a user as stored in MongoDB. Mongoose adds _id, createdAt, etc.
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string; // never the plain password
  name: string;
  profile: {
    weight: number;
    calorieGoal: number;
    proteinGoal: number;
    fiberGoal: number;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plain: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // fast lookup by email (login uses this)
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    profile: {
      weight: { type: Number, default: 70, min: 20, max: 300 },
      calorieGoal: { type: Number, default: 2000, min: 800, max: 6000 },
      proteinGoal: { type: Number, default: 120, min: 20, max: 500 },
      fiberGoal: { type: Number, default: 30, min: 5, max: 100 },
    },
  },
  {
    timestamps: true, // auto-adds createdAt and updatedAt
    toJSON: {
      // when User is sent in API responses, never include the password hash
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Instance method: check if a plaintext password matches the stored hash.
// Putting this on the model keeps the bcrypt details out of route handlers.
userSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

// Static helper: hash a password before saving. We expose this rather than
// auto-hashing in a pre-save hook because we want explicit control over when
// hashing happens (e.g., not when updating other fields).
export async function hashPassword(plain: string): Promise<string> {
  // 12 rounds = ~250ms per hash on modern hardware. Slow enough to thwart
  // brute force, fast enough that login isn't sluggish.
  return bcrypt.hash(plain, 12);
}

export const User = model<IUser>('User', userSchema);
