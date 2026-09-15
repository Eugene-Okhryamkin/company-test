import { Router } from 'express';
import type { OrgTreeController } from '@/controllers/org-tree.controller.js';

export function createOrgTreeRouter(controller: OrgTreeController): Router {
  const router = Router();
  router.get('/org-tree', controller.getOrgTree);
  return router;
}
