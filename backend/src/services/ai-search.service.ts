import { LlmNotConfiguredError, LlmRequestError, type LlmClient } from '@/clients/openai-responses.client.js';
import type { SearchFilter } from '@/models/search-filter.model.js';
import { SEARCH_FILTER_INSTRUCTIONS } from '@/services/ai-search.prompt.js';
import { SEARCH_FILTER_JSON_SCHEMA } from '@/services/search-filter.json-schema.js';
import { InvalidSearchFilterError, parseSearchFilter } from '@/services/search-filter.validator.js';

export const MAX_QUERY_LENGTH = 300;

export class InvalidSearchQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSearchQueryError';
  }
}

/** AI search is switched off (no API key). Clients fall back to text search. */
export class AiSearchUnavailableError extends Error {
  constructor() {
    super('AI search is not configured');
    this.name = 'AiSearchUnavailableError';
  }
}

/** The LLM could not produce a usable filter. Clients fall back to text search. */
export class AiSearchFailedError extends Error {
  constructor(cause: unknown) {
    super('AI search failed', { cause });
    this.name = 'AiSearchFailedError';
  }
}

export interface AiSearchServiceApi {
  isEnabled(): boolean;
  interpret(query: unknown): Promise<SearchFilter>;
}

export interface AiSearchServiceDeps {
  llmClient: LlmClient;
}

/** Turns a natural-language query into a validated structured filter. */
export class AiSearchService implements AiSearchServiceApi {
  private readonly llmClient: LlmClient;

  constructor({ llmClient }: AiSearchServiceDeps) {
    this.llmClient = llmClient;
  }

  isEnabled(): boolean {
    return this.llmClient.isConfigured();
  }

  async interpret(query: unknown): Promise<SearchFilter> {
    const input = typeof query === 'string' ? query.trim() : '';
    if (input === '') throw new InvalidSearchQueryError('"query" must be a non-empty string');
    if (input.length > MAX_QUERY_LENGTH) {
      throw new InvalidSearchQueryError(`"query" must be at most ${MAX_QUERY_LENGTH} characters`);
    }
    if (!this.isEnabled()) throw new AiSearchUnavailableError();

    try {
      const answer = await this.llmClient.generateStructured({
        instructions: SEARCH_FILTER_INSTRUCTIONS,
        input,
        schemaName: 'search_filter',
        schema: SEARCH_FILTER_JSON_SCHEMA,
      });
      return parseSearchFilter(answer);
    } catch (error) {
      if (error instanceof LlmNotConfiguredError) throw new AiSearchUnavailableError();
      if (error instanceof LlmRequestError || error instanceof InvalidSearchFilterError) {
        console.warn('[backend] AI search failed:', error.message);
        throw new AiSearchFailedError(error);
      }
      throw error;
    }
  }
}
