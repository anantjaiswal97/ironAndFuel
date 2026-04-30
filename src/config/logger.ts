import pino from 'pino';
import { env, isProduction } from './env.js';

// In production: structured JSON logs (machines parse them, log aggregators index them)
// In development: pretty-printed colored logs (humans read them)
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProduction
    ? {} // raw JSON output for log aggregators
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }),
});
