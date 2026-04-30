import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Validate environment variables on startup. If anything is missing, the
// server refuses to start with a clear error message. Better to fail fast
// than silently use undefined values that crash later.
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 chars (use a long random string)"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GEMINI_API_KEY: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
  // The line above terminates the process. The throw below is unreachable
  // at runtime but tells TypeScript that execution doesn't continue past
  // this block, so `parsed.data` below is guaranteed non-undefined.
  throw new Error("unreachable");
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
