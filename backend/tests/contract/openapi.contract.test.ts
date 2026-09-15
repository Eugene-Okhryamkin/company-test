import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import { LlmRequestError, type LlmClient } from '@/clients/openai-responses.client.js';
import { LIVE_UPDATES_PATH } from '@/gateways/live-updates.gateway.js';
import { createTestApp } from '@tests/helpers/test-app.js';

/**
 * Contract tests: the real app's responses must match backend/docs/openapi.yml,
 * so the spec cannot silently drift from the code.
 */
interface Operation {
  operationId: string;
  responses: Record<string, { content?: Record<string, { schema?: unknown; example?: unknown }> }>;
  requestBody?: { content: Record<string, { schema: unknown; example?: unknown }> };
}
interface Spec {
  openapi: string;
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, unknown> };
}

const spec = parse(readFileSync(new URL('../../docs/openapi.yml', import.meta.url), 'utf8')) as Spec;

const ajv = new Ajv2020({ strict: false, allErrors: true });
ajv.addSchema({ $id: 'openapi', components: spec.components });

function expectValid(schemaName: string, data: unknown) {
  const validate = ajv.getSchema(`openapi#/components/schemas/${schemaName}`);
  if (!validate) throw new Error(`schema ${schemaName} is not in the spec`);
  const valid = validate(data);
  expect(valid, `${schemaName}: ${ajv.errorsText(validate.errors)}`).toBe(true);
}

function expectDocumented(path: string, method: string, status: number) {
  expect(Object.keys(spec.paths[path]?.[method]?.responses ?? {}), `${method.toUpperCase()} ${path}`).toContain(
    String(status),
  );
}

const filter = {
  nameContains: 'Платформа',
  levels: [2, 3],
  totalHeadcount: { min: 5, max: null },
  totalBudget: { min: null, max: 10_000_000 },
  avgPerformance: { min: 60, max: 100 },
  sort: { key: 'avgPerformance', direction: 'desc' },
  limit: 3,
};

function appWithLlm(llm: Partial<LlmClient> = {}) {
  const llmClient: LlmClient = { isConfigured: () => true, generateStructured: vi.fn().mockResolvedValue(filter), ...llm };
  return createTestApp({ llmClient });
}

describe('openapi.yml', () => {
  it('is an OpenAPI 3.1 document whose schemas compile', () => {
    expect(spec.openapi).toMatch(/^3\.1\./);
    for (const name of Object.keys(spec.components.schemas)) {
      expect(ajv.getSchema(`openapi#/components/schemas/${name}`), name).toBeDefined();
    }
  });

  it('has examples that satisfy their own schemas', () => {
    const resolve = (schema: unknown) =>
      (schema as { $ref?: string }).$ref ? ajv.getSchema(`openapi${(schema as { $ref: string }).$ref}`)! : ajv.compile(schema as object);
    let checked = 0;
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const media = [
          ...Object.values(operation.requestBody?.content ?? {}),
          ...Object.values(operation.responses).flatMap((response) => Object.values(response.content ?? {})),
        ];
        for (const { schema, example } of media) {
          if (example === undefined || schema === undefined) continue;
          const validate = resolve(schema);
          expect(validate(example), `${method} ${path}: ${ajv.errorsText(validate.errors)}`).toBe(true);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('documents only routes that exist (the WebSocket path is served by the gateway)', async () => {
    const { app } = appWithLlm();
    for (const [path, methods] of Object.entries(spec.paths)) {
      if (path === LIVE_UPDATES_PATH) continue;
      for (const method of Object.keys(methods) as Array<'get' | 'post'>) {
        const res = await request(app)[method](path).send(method === 'post' ? { query: 'команды' } : undefined);
        expect(res.status, `${method.toUpperCase()} ${path}`).not.toBe(404);
      }
    }
    expect(spec.paths[LIVE_UPDATES_PATH]).toBeDefined();
  });
});

describe('API responses match openapi.yml', () => {
  it('GET /api/org-tree', async () => {
    const res = await request(createTestApp().app).get('/api/org-tree');

    expectDocumented('/api/org-tree', 'get', res.status);
    expectValid('OrgNodeList', res.body);
    expect(res.headers['x-data-version']).toMatch(/^\d+$/);
  });

  it('GET /api/search/status', async () => {
    const res = await request(appWithLlm().app).get('/api/search/status');

    expectDocumented('/api/search/status', 'get', res.status);
    expectValid('SearchStatus', res.body);
  });

  it('POST /api/search/interpret → 200', async () => {
    const res = await request(appWithLlm().app).post('/api/search/interpret').send({ query: 'лучшие отделы' });

    expect(res.status).toBe(200);
    expectDocumented('/api/search/interpret', 'post', res.status);
    expectValid('InterpretResponse', res.body);
  });

  it.each([
    ['400 blank query', () => appWithLlm(), { query: '' }],
    ['413 oversized body', () => appWithLlm(), { query: 'a'.repeat(20_000) }],
    ['503 not configured', () => createTestApp(), { query: 'команды' }],
    [
      '502 LLM failure',
      () => appWithLlm({ generateStructured: vi.fn().mockRejectedValue(new LlmRequestError('timeout', 'slow')) }),
      { query: 'команды' },
    ],
  ])('POST /api/search/interpret → %s', async (_label, makeApp, body) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await request(makeApp().app).post('/api/search/interpret').send(body);

    expectDocumented('/api/search/interpret', 'post', res.status);
    expectValid('Error', res.body);
  });

  it('live patch messages', async () => {
    const { container } = createTestApp();
    const patch = await container.resolve('orgTreeService').applyChanges([{ id: 'd1', fields: { headcount: 7 } }]);

    expectValid('LiveMessage', container.resolve('orgNodeMapper').toPatchMessage(patch!));
    expectValid('LiveMessage', { type: 'hello', version: 0, heartbeatIntervalMs: 15000 });
    expectValid('LiveMessage', { type: 'heartbeat', version: 3 });
  });
});
