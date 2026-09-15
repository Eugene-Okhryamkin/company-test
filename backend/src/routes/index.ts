import { Router } from 'express';
import type { AppContainer } from '@/di/container.js';
import { createOrgTreeRouter } from '@/routes/org-tree.routes.js';

export function createApiRouter(container: AppContainer): Router {
  const router = Router();
  router.use(createOrgTreeRouter(container.resolve('orgTreeController')));
  return router;
}
