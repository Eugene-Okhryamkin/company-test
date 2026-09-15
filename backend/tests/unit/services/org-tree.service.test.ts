import { describe, expect, it, vi } from 'vitest';
import type { OrgNode } from '@/models/org-node.model.js';
import type { OrgNodeRepository } from '@/repositories/org-node.repository.js';
import { OrgTreeService } from '@/services/org-tree.service.js';
import { OrgTreeIntegrityError } from '@/services/org-tree.validator.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';

const repositoryReturning = (nodes: OrgNode[]): OrgNodeRepository => ({
  findAll: vi.fn().mockResolvedValue(nodes),
});

describe('OrgTreeService.getFlatTree', () => {
  it('returns the flat list of nodes from the injected repository', async () => {
    const nodes = [makeNode({ id: 'd1' }), makeNode({ id: 'd1-1', parentId: 'd1' })];
    const orgNodeRepository = repositoryReturning(nodes);
    const service = new OrgTreeService({ orgNodeRepository });

    await expect(service.getFlatTree()).resolves.toEqual(nodes);
    expect(orgNodeRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('returns an empty list when there is no data', async () => {
    const service = new OrgTreeService({ orgNodeRepository: repositoryReturning([]) });
    await expect(service.getFlatTree()).resolves.toEqual([]);
  });

  it('refuses to return data that breaks tree integrity', async () => {
    const service = new OrgTreeService({
      orgNodeRepository: repositoryReturning([makeNode({ id: 'a', parentId: 'missing' })]),
    });
    await expect(service.getFlatTree()).rejects.toBeInstanceOf(OrgTreeIntegrityError);
  });

  it('propagates repository failures', async () => {
    const service = new OrgTreeService({
      orgNodeRepository: { findAll: vi.fn().mockRejectedValue(new Error('storage down')) },
    });
    await expect(service.getFlatTree()).rejects.toThrow('storage down');
  });
});
