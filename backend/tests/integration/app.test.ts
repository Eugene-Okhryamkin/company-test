import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '@tests/helpers/test-app.js';

const { app } = createTestApp();

describe('app', () => {
  it('responds 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not Found' });
  });

  it('does not expose a health-check endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(404);
  });

  it('does not expose the X-Powered-By header', async () => {
    const res = await request(app).get('/api/org-tree');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
