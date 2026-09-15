import express from 'express';
import type { AppContainer } from '@/di/container.js';
import { errorHandler } from '@/middlewares/error-handler.middleware.js';
import { notFound } from '@/middlewares/not-found.middleware.js';
import { createApiRouter } from '@/routes/index.js';

export function createApp(container: AppContainer) {
  const app = express();

  app.disable('x-powered-by');
  app.use('/api', createApiRouter(container));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
