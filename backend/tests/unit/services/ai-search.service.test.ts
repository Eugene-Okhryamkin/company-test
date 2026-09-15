import { describe, expect, it, vi } from 'vitest';
import { LlmNotConfiguredError, LlmRequestError, type LlmClient } from '@/clients/openai-responses.client.js';
import {
  AiSearchFailedError,
  AiSearchService,
  AiSearchUnavailableError,
  InvalidSearchQueryError,
  MAX_QUERY_LENGTH,
} from '@/services/ai-search.service.js';
import { SEARCH_FILTER_JSON_SCHEMA } from '@/services/search-filter.json-schema.js';
import { EMPTY_SEARCH_FILTER } from '@/services/search-filter.validator.js';

function createService(llm: Partial<LlmClient> = {}) {
  const llmClient: LlmClient = {
    isConfigured: () => true,
    generateStructured: vi.fn().mockResolvedValue(EMPTY_SEARCH_FILTER),
    ...llm,
  };
  return { service: new AiSearchService({ llmClient }), llmClient };
}

describe('AiSearchService', () => {
  it('is enabled when the LLM client is configured', () => {
    expect(createService().service.isEnabled()).toBe(true);
    expect(createService({ isConfigured: () => false }).service.isEnabled()).toBe(false);
  });

  it('asks the LLM for a strict search filter and returns the validated result', async () => {
    const generateStructured = vi.fn().mockResolvedValue({
      ...EMPTY_SEARCH_FILTER,
      levels: [3, 3],
      totalBudget: { min: 5_000_000, max: null },
    });
    const { service } = createService({ generateStructured });

    const filter = await service.interpret('  команды с бюджетом от 5 млн ');

    expect(generateStructured).toHaveBeenCalledWith({
      instructions: expect.stringContaining('totalBudget'),
      input: 'команды с бюджетом от 5 млн',
      schemaName: 'search_filter',
      schema: SEARCH_FILTER_JSON_SCHEMA,
    });
    expect(filter).toEqual({ ...EMPTY_SEARCH_FILTER, levels: [3], totalBudget: { min: 5_000_000, max: null } });
  });

  it.each([
    ['a non-string', 42],
    ['a blank string', '   '],
    ['a too long string', 'a'.repeat(MAX_QUERY_LENGTH + 1)],
  ])('rejects %s query without calling the LLM', async (_label, query) => {
    const { service, llmClient } = createService();

    await expect(service.interpret(query)).rejects.toBeInstanceOf(InvalidSearchQueryError);
    expect(llmClient.generateStructured).not.toHaveBeenCalled();
  });

  it('reports unavailability when no LLM is configured', async () => {
    const { service, llmClient } = createService({ isConfigured: () => false });

    await expect(service.interpret('команды')).rejects.toBeInstanceOf(AiSearchUnavailableError);
    expect(llmClient.generateStructured).not.toHaveBeenCalled();
  });

  it('treats a missing key discovered by the client as unavailability', async () => {
    const { service } = createService({ generateStructured: vi.fn().mockRejectedValue(new LlmNotConfiguredError()) });
    await expect(service.interpret('команды')).rejects.toBeInstanceOf(AiSearchUnavailableError);
  });

  it('wraps upstream failures', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { service } = createService({
      generateStructured: vi.fn().mockRejectedValue(new LlmRequestError('timeout', 'timed out')),
    });

    await expect(service.interpret('команды')).rejects.toBeInstanceOf(AiSearchFailedError);
  });

  it('wraps an answer that does not satisfy the filter contract', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { service } = createService({ generateStructured: vi.fn().mockResolvedValue({ levels: 'teams' }) });

    await expect(service.interpret('команды')).rejects.toBeInstanceOf(AiSearchFailedError);
  });

  it('does not swallow unexpected programming errors', async () => {
    const { service } = createService({ generateStructured: vi.fn().mockRejectedValue(new RangeError('bug')) });
    await expect(service.interpret('команды')).rejects.toBeInstanceOf(RangeError);
  });
});

describe('SEARCH_FILTER_JSON_SCHEMA', () => {
  type JsonSchema = { type?: unknown; properties?: Record<string, JsonSchema>; required?: readonly string[]; additionalProperties?: unknown; anyOf?: JsonSchema[]; items?: JsonSchema };

  /** Structured Outputs strict mode: every object lists all properties as required and forbids extras. */
  function assertStrict(schema: JsonSchema, path = '$') {
    if (schema.properties) {
      expect(schema.additionalProperties, path).toBe(false);
      expect([...(schema.required ?? [])].sort(), path).toEqual(Object.keys(schema.properties).sort());
      for (const [key, child] of Object.entries(schema.properties)) assertStrict(child, `${path}.${key}`);
    }
    schema.anyOf?.forEach((child, index) => assertStrict(child, `${path}.anyOf[${index}]`));
    if (schema.items) assertStrict(schema.items, `${path}[]`);
  }

  it('is compatible with strict structured outputs', () => {
    assertStrict(SEARCH_FILTER_JSON_SCHEMA as unknown as JsonSchema);
  });

  it('describes exactly the fields of the filter model', () => {
    expect(Object.keys(SEARCH_FILTER_JSON_SCHEMA.properties).sort()).toEqual(Object.keys(EMPTY_SEARCH_FILTER).sort());
  });
});
