import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { LlmRequestError, type LlmClient } from '@/clients/openai-responses.client.js';
import { EMPTY_SEARCH_FILTER } from '@/services/search-filter.validator.js';
import { createTestApp } from '@tests/helpers/test-app.js';

function appWithLlm(llm: Partial<LlmClient> = {}) {
  const llmClient: LlmClient = {
    isConfigured: () => true,
    generateStructured: vi.fn().mockResolvedValue({ ...EMPTY_SEARCH_FILTER, levels: [3] }),
    ...llm,
  };
  return { app: createTestApp({ llmClient }).app, llmClient };
}

describe('GET /api/search/status', () => {
  it('reports that AI search is enabled', async () => {
    const res = await request(appWithLlm().app).get('/api/search/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ aiEnabled: true });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('reports that AI search is disabled without an API key', async () => {
    const res = await request(createTestApp().app).get('/api/search/status');
    expect(res.body).toEqual({ aiEnabled: false });
  });
});

describe('POST /api/search/interpret', () => {
  it('responds 200 with the structured filter', async () => {
    const { app, llmClient } = appWithLlm();

    const res = await request(app).post('/api/search/interpret').send({ query: 'все команды' });

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ filter: { ...EMPTY_SEARCH_FILTER, levels: [3] } });
    expect(llmClient.generateStructured).toHaveBeenCalledWith(expect.objectContaining({ input: 'все команды' }));
  });

  it.each([
    ['no body', undefined],
    ['a missing query', {}],
    ['a blank query', { query: ' ' }],
    ['a non-string query', { query: ['a'] }],
  ])('responds 400 for %s', async (_label, body) => {
    const { app, llmClient } = appWithLlm();

    const res = await request(app).post('/api/search/interpret').send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect(llmClient.generateStructured).not.toHaveBeenCalled();
  });

  it('responds 400 for malformed JSON', async () => {
    const res = await request(appWithLlm().app)
      .post('/api/search/interpret')
      .set('Content-Type', 'application/json')
      .send('{"query":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Bad Request' });
  });

  it('responds 413 for an oversized body', async () => {
    const res = await request(appWithLlm().app)
      .post('/api/search/interpret')
      .send({ query: 'a'.repeat(20_000) });

    expect(res.status).toBe(413);
  });

  it('responds 503 when AI search is not configured', async () => {
    const res = await request(createTestApp().app).post('/api/search/interpret').send({ query: 'команды' });

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: 'AI search is not configured' });
  });

  it('responds 502 when the LLM fails, without leaking details', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { app } = appWithLlm({
      generateStructured: vi.fn().mockRejectedValue(new LlmRequestError('http', 'upstream said sk-secret', 401)),
    });

    const res = await request(app).post('/api/search/interpret').send({ query: 'команды' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'AI search failed' });
    expect(res.text).not.toContain('sk-secret');
  });

  it('responds 404 to GET (only POST is supported)', async () => {
    const res = await request(appWithLlm().app).get('/api/search/interpret');
    expect(res.status).toBe(404);
  });
});
