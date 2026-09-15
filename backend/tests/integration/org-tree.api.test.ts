import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { OrgNode } from '@/models/org-node.model.js';
import { orgNodesSeed } from '@/seeds/org-nodes.seed.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';
import { createTestApp } from '@tests/helpers/test-app.js';

const appWith = (nodes: readonly OrgNode[] = orgNodesSeed) =>
  createTestApp({ orgNodesSeed: nodes }).app;

describe('GET /api/org-tree', () => {
  it('responds 200 with a JSON flat array', async () => {
    const res = await request(appWith()).get('/api/org-tree');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(orgNodesSeed.length);
  });

  it('returns every node in the documented shape', async () => {
    const res = await request(appWith()).get('/api/org-tree');

    for (const node of res.body) {
      expect(node).toStrictEqual({
        id: expect.any(String),
        name: expect.any(String),
        parentId: node.parentId === null ? null : expect.any(String),
        headcount: expect.any(Number),
        budget: expect.any(Number),
        performance: expect.any(Number),
        updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      });
      expect(node.performance).toBeGreaterThanOrEqual(0);
      expect(node.performance).toBeLessThanOrEqual(100);
    }
  });

  it('returns an empty array when there is no data', async () => {
    const res = await request(appWith([])).get('/api/org-tree');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('asks clients to revalidate and supports conditional requests via ETag', async () => {
    const app = appWith();
    const first = await request(app).get('/api/org-tree');

    expect(first.headers['cache-control']).toBe('no-cache');
    expect(first.headers.etag).toBeDefined();

    const second = await request(app)
      .get('/api/org-tree')
      .set('If-None-Match', first.headers.etag as string);

    expect(second.status).toBe(304);
    expect(second.text).toBe('');
  });

  it('changes the ETag when the data changes', async () => {
    const a = await request(appWith([makeNode({ id: 'a', headcount: 1 })])).get('/api/org-tree');
    const b = await request(appWith([makeNode({ id: 'a', headcount: 2 })])).get('/api/org-tree');

    expect(a.headers.etag).not.toBe(b.headers.etag);
  });

  it('responds 500 with a JSON error when data integrity is broken', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appWith([makeNode({ id: 'a', parentId: 'ghost' })])).get(
      '/api/org-tree',
    );

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal Server Error' });
  });

  it('responds 500 when the injected service fails unexpectedly', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { app } = createTestApp({
      orgTreeService: { getFlatTree: vi.fn().mockRejectedValue(new Error('boom')) },
    });

    const res = await request(app).get('/api/org-tree');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal Server Error' });
    expect(JSON.stringify(res.body)).not.toContain('boom');
  });

  it.each(['post', 'put', 'patch', 'delete'] as const)(
    'responds 404 to %s (read-only resource)',
    async (method) => {
      const res = await request(appWith())[method]('/api/org-tree');
      expect(res.status).toBe(404);
    },
  );
});
