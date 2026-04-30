import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDatabase(): Promise<void> {
  try {
    // Set strict query mode - mongoose ignores fields not in the schema
    // when querying. Catches typos like User.find({ emial: '...' }).
    mongoose.set('strictQuery', true);

    await mongoose.connect(env.MONGODB_URI, {
      // Mongoose 8 has sensible defaults; only override what's needed.
      serverSelectionTimeoutMS: 10_000, // Fail fast if can't reach DB
    });

    logger.info('✅ MongoDB connected');

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
  } catch (err) {
    logger.fatal({ err }, '❌ MongoDB connection failed - server cannot start');
    process.exit(1);
  }
}
