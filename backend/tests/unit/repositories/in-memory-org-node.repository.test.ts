import { describe, expect, it } from 'vitest';
import { InMemoryOrgNodeRepository } from '@/repositories/org-node.repository.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';

describe('InMemoryOrgNodeRepository', () => {
  it('returns all seeded nodes in insertion order', async () => {
    const seed = [makeNode({ id: 'a' }), makeNode({ id: 'b', parentId: 'a' })];
    const repository = new InMemoryOrgNodeRepository({ orgNodesSeed: seed });

    const nodes = await repository.findAll();

    expect(nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(nodes).toEqual(seed);
  });

  it('is not affected by later mutation of the seed array', async () => {
    const seed = [makeNode({ id: 'a', name: 'Original' })];
    const repository = new InMemoryOrgNodeRepository({ orgNodesSeed: seed });

    seed[0]!.name = 'Mutated';
    seed.push(makeNode({ id: 'b' }));

    const nodes = await repository.findAll();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]!.name).toBe('Original');
  });

  it('returns copies so callers cannot mutate the store', async () => {
    const repository = new InMemoryOrgNodeRepository({
      orgNodesSeed: [makeNode({ id: 'a', headcount: 5 })],
    });

    const first = await repository.findAll();
    first[0]!.headcount = 999;
    first[0]!.updatedAt.setFullYear(1999);

    const second = await repository.findAll();
    expect(second[0]!.headcount).toBe(5);
    expect(second[0]!.updatedAt.getFullYear()).toBe(2026);
  });

  describe('saveMany', () => {
    it('replaces stored nodes by id, keeping order and other nodes', async () => {
      const repository = new InMemoryOrgNodeRepository({
        orgNodesSeed: [makeNode({ id: 'a', headcount: 1 }), makeNode({ id: 'b', headcount: 2 })],
      });

      await repository.saveMany([makeNode({ id: 'b', headcount: 20 })]);

      expect((await repository.findAll()).map((n) => [n.id, n.headcount])).toEqual([
        ['a', 1],
        ['b', 20],
      ]);
    });

    it('stores copies of the saved nodes', async () => {
      const repository = new InMemoryOrgNodeRepository({ orgNodesSeed: [makeNode({ id: 'a' })] });
      const saved = makeNode({ id: 'a', headcount: 7 });

      await repository.saveMany([saved]);
      saved.headcount = 999;

      expect((await repository.findAll())[0]!.headcount).toBe(7);
    });

    it('ignores nodes that are not stored', async () => {
      const repository = new InMemoryOrgNodeRepository({ orgNodesSeed: [makeNode({ id: 'a' })] });

      await repository.saveMany([makeNode({ id: 'ghost' })]);

      expect((await repository.findAll()).map((n) => n.id)).toEqual(['a']);
    });
  });
});
