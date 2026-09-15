import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { OrgTreeController } from '@/controllers/org-tree.controller.js';
import { OrgNodeMapper } from '@/mappers/org-node.mapper.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';

function mockResponse() {
  const res = { set: vi.fn(), json: vi.fn() };
  res.set.mockReturnValue(res);
  return res;
}

describe('OrgTreeController.getOrgTree', () => {
  it('responds with DTOs produced by the injected mapper from service data', async () => {
    const nodes = [makeNode({ id: 'a' })];
    const orgTreeService = { getSnapshot: vi.fn().mockResolvedValue({ version: 3, nodes }), getVersion: () => 3 };
    const orgNodeMapper = new OrgNodeMapper();
    const toDtoList = vi.spyOn(orgNodeMapper, 'toDtoList');
    const controller = new OrgTreeController({ orgTreeService, orgNodeMapper });
    const res = mockResponse();

    await controller.getOrgTree({} as Request, res as unknown as Response, vi.fn());

    expect(orgTreeService.getSnapshot).toHaveBeenCalledTimes(1);
    expect(toDtoList).toHaveBeenCalledWith(nodes);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.set).toHaveBeenCalledWith('X-Data-Version', '3');
    expect(res.json).toHaveBeenCalledWith([expect.objectContaining({ id: 'a', updatedAt: expect.any(String) })]);
  });

  it('keeps `this` bound when passed to Express as a bare function', async () => {
    const controller = new OrgTreeController({
      orgTreeService: { getSnapshot: vi.fn().mockResolvedValue({ version: 0, nodes: [] }), getVersion: () => 0 },
      orgNodeMapper: new OrgNodeMapper(),
    });
    const { getOrgTree } = controller;
    const res = mockResponse();

    await expect(getOrgTree({} as Request, res as unknown as Response, vi.fn())).resolves.toBeUndefined();
    expect(res.json).toHaveBeenCalledWith([]);
  });
});
