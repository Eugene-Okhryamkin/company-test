import type { RequestHandler } from 'express';
import {
  AiSearchFailedError,
  AiSearchUnavailableError,
  InvalidSearchQueryError,
  type AiSearchServiceApi,
} from '@/services/ai-search.service.js';

export interface SearchControllerDeps {
  aiSearchService: AiSearchServiceApi;
}

export class SearchController {
  private readonly aiSearchService: AiSearchServiceApi;

  constructor({ aiSearchService }: SearchControllerDeps) {
    this.aiSearchService = aiSearchService;
  }

  /** GET /api/search/status — lets the client decide whether to offer AI search at all. */
  getStatus: RequestHandler = (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ aiEnabled: this.aiSearchService.isEnabled() });
  };

  /** POST /api/search/interpret — natural-language query → structured filter. */
  interpret: RequestHandler = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const query: unknown = (req.body as { query?: unknown } | undefined)?.query;

    try {
      const filter = await this.aiSearchService.interpret(query);
      res.json({ filter });
    } catch (error) {
      if (error instanceof InvalidSearchQueryError) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof AiSearchUnavailableError) {
        res.status(503).json({ error: 'AI search is not configured' });
      } else if (error instanceof AiSearchFailedError) {
        res.status(502).json({ error: 'AI search failed' });
      } else {
        throw error;
      }
    }
  };
}
