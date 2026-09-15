import { describe, expect, it, vi } from 'vitest';
import { OrgTreeChangeBus } from '@/events/org-tree-change-bus.js';
import type { OrgNode } from '@/models/org-node.model.js';
import { InMemoryOrgNodeRepository, type OrgNodeRepository } from '@/repositories/org-node.repository.js';
import { OrgNodeNotFoundError, OrgTreeService } from '@/services/org-tree.service.js';
import { OrgTreeIntegrityError } from '@/services/org-tree.validator.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';

const NOW = new Date('2026-09-15T10:00:00.000Z');

const repositoryReturning = (nodes: OrgNode[]): OrgNodeRepository => ({
  findAll: vi.fn().mockResolvedValue(nodes),
  saveMany: vi.fn().mockResolvedValue(undefined),
});

function createService(nodes: OrgNode[] = [makeNode({ id: 'd1' }), makeNode({ id: 'd1-1', parentId: 'd1' })]) {
  const orgNodeRepository = new InMemoryOrgNodeRepository({ orgNodesSeed: nodes });
  const orgTreeChangeBus = new OrgTreeChangeBus();
  const service = new OrgTreeService({ orgNodeRepository, orgTreeChangeBus, clock: () => NOW });
  return { service, orgNodeRepository, orgTreeChangeBus };
}

describe('OrgTreeService.getSnapshot', () => {
  it('returns the flat list with the current data version', async () => {
    const nodes = [makeNode({ id: 'd1' }), makeNode({ id: 'd1-1', parentId: 'd1' })];
    const service = new OrgTreeService({
      orgNodeRepository: repositoryReturning(nodes),
      orgTreeChangeBus: new OrgTreeChangeBus(),
    });

    await expect(service.getSnapshot()).resolves.toEqual({ version: 0, nodes });
  });

  it('returns an empty list when there is no data', async () => {
    const service = new OrgTreeService({
      orgNodeRepository: repositoryReturning([]),
      orgTreeChangeBus: new OrgTreeChangeBus(),
    });
    await expect(service.getSnapshot()).resolves.toEqual({ version: 0, nodes: [] });
  });

  it('refuses to return data that breaks tree integrity', async () => {
    const service = new OrgTreeService({
      orgNodeRepository: repositoryReturning([makeNode({ id: 'a', parentId: 'missing' })]),
      orgTreeChangeBus: new OrgTreeChangeBus(),
    });
    await expect(service.getSnapshot()).rejects.toBeInstanceOf(OrgTreeIntegrityError);
  });

  it('propagates repository failures', async () => {
    const service = new OrgTreeService({
      orgNodeRepository: { findAll: vi.fn().mockRejectedValue(new Error('storage down')), saveMany: vi.fn() },
      orgTreeChangeBus: new OrgTreeChangeBus(),
    });
    await expect(service.getSnapshot()).rejects.toThrow('storage down');
  });
});

describe('OrgTreeService.applyChanges', () => {
  it('updates metrics, bumps the version and returns the patch with full updated nodes', async () => {
    const { service } = createService();

    const patch = await service.applyChanges([{ id: 'd1-1', fields: { headcount: 42, performance: 91.5 } }]);

    expect(patch).toEqual({
      version: 1,
      nodes: [expect.objectContaining({ id: 'd1-1', headcount: 42, performance: 91.5, updatedAt: NOW })],
    });
    expect(service.getVersion()).toBe(1);
    const { nodes, version } = await service.getSnapshot();
    expect(version).toBe(1);
    expect(nodes.find((n) => n.id === 'd1-1')).toMatchObject({ headcount: 42, performance: 91.5, updatedAt: NOW });
  });

  it('changes only the given fields', async () => {
    const { service } = createService([makeNode({ id: 'a', headcount: 5, budget: 100, performance: 50 })]);

    await service.applyChanges([{ id: 'a', fields: { budget: 200 } }]);

    expect((await service.getSnapshot()).nodes[0]).toMatchObject({ headcount: 5, budget: 200, performance: 50 });
  });

  it('publishes the patch to subscribers', async () => {
    const { service, orgTreeChangeBus } = createService();
    const listener = vi.fn();
    orgTreeChangeBus.subscribe(listener);

    const patch = await service.applyChanges([{ id: 'd1', fields: { budget: 1 } }]);

    expect(listener).toHaveBeenCalledWith(patch);
  });

  it('applies a batch of changes as one version', async () => {
    const { service } = createService();

    const patch = await service.applyChanges([
      { id: 'd1', fields: { headcount: 1 } },
      { id: 'd1-1', fields: { headcount: 2 } },
    ]);

    expect(patch?.version).toBe(1);
    expect(patch?.nodes.map((n) => n.id)).toEqual(['d1', 'd1-1']);
  });

  it('increments the version for every batch', async () => {
    const { service } = createService();
    await service.applyChanges([{ id: 'd1', fields: { headcount: 1 } }]);
    const second = await service.applyChanges([{ id: 'd1', fields: { headcount: 2 } }]);
    expect(second?.version).toBe(2);
  });

  it('does nothing for an empty batch', async () => {
    const { service, orgTreeChangeBus } = createService();
    const listener = vi.fn();
    orgTreeChangeBus.subscribe(listener);

    await expect(service.applyChanges([])).resolves.toBeNull();
    expect(service.getVersion()).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it.each([
    [{ id: 'ghost', fields: { headcount: 1 } }, OrgNodeNotFoundError],
    [{ id: 'd1-1', fields: { performance: 101 } }, OrgTreeIntegrityError],
    [{ id: 'd1-1', fields: { headcount: -1 } }, OrgTreeIntegrityError],
    [{ id: 'd1-1', fields: { budget: Number.NaN } }, OrgTreeIntegrityError],
  ])('rejects the whole batch atomically for %j', async (bad, errorType) => {
    const { service, orgTreeChangeBus } = createService();
    const listener = vi.fn();
    orgTreeChangeBus.subscribe(listener);
    const before = await service.getSnapshot();

    await expect(
      service.applyChanges([{ id: 'd1', fields: { headcount: 99 } }, bad]),
    ).rejects.toBeInstanceOf(errorType);

    expect(await service.getSnapshot()).toEqual(before);
    expect(listener).not.toHaveBeenCalled();
  });
});
