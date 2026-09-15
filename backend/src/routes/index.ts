import { Router } from 'express';
import type { AppContainer } from '@/di/container.js';
import { createOrgTreeRouter } from '@/routes/org-tree.routes.js';
import { createSearchRouter } from '@/routes/search.routes.js';

export function createApiRouter(container: AppContainer): Router {
  const router = Router();
  router.use(createOrgTreeRouter(container.resolve('orgTreeController')));
  router.use(createSearchRouter(container.resolve('searchController')));
  return router;
}
