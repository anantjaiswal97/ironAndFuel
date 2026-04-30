import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import dietRoutes from './routes/diet.js';
import aiRoutes from './routes/ai.js';

async function start(): Promise<void> {
  await connectDatabase();

  const app = express();

  // Trust proxy headers - needed because Render runs us behind a load balancer.
  // Without this, rate limiter sees all requests as coming from one IP.
  app.set('trust proxy', 1);

  // Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
  app.use(helmet());

  // CORS: only allow our frontend origin. Without this, any website could call
  // our API from a user's browser session.
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );

  // Body parsing with size limit (prevents huge-payload DoS)
  app.use(express.json({ limit: '100kb' }));

  // Request logging
  app.use((req, _res, next) => {
    logger.info({ method: req.method, path: req.path }, 'incoming request');
    next();
  });

  // Health check - Render and uptime monitors hit this
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/diet', dietRoutes);
  app.use('/api/ai', aiRoutes);

  // 404 for unknown routes
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
  });

  // Error handler must be last
  app.use(errorHandler);

  app.listen(env.PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
    logger.info(`   Frontend allowed: ${env.FRONTEND_URL}`);
  });
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
