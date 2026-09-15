import express, { Router } from 'express';
import type { SearchController } from '@/controllers/search.controller.js';

/** A search query is a short sentence; anything bigger is rejected by body-parser with 413. */
const JSON_BODY_LIMIT = '8kb';

export function createSearchRouter(controller: SearchController): Router {
  const router = Router();
  router.get('/search/status', controller.getStatus);
  router.post('/search/interpret', express.json({ limit: JSON_BODY_LIMIT }), controller.interpret);
  return router;
}
