import { describe, expect, it } from 'vitest';
import { OrgNodeMapper } from '@/mappers/org-node.mapper.js';
import { makeNode } from '@tests/helpers/org-node.factory.js';

const mapper = new OrgNodeMapper();

describe('OrgNodeMapper', () => {
  it('maps a model to the public DTO', () => {
    const node = makeNode({
      id: 'd1-1',
      name: 'Платформа',
      parentId: 'd1',
      headcount: 3,
      budget: 6_200_000,
      performance: 85,
      updatedAt: new Date('2026-09-01T09:30:00.000Z'),
    });

    expect(mapper.toDto(node)).toStrictEqual({
      id: 'd1-1',
      name: 'Платформа',
      parentId: 'd1',
      headcount: 3,
      budget: 6_200_000,
      performance: 85,
      updatedAt: '2026-09-01T09:30:00.000Z',
    });
  });

  it('keeps parentId null for root nodes', () => {
    expect(mapper.toDto(makeNode({ parentId: null })).parentId).toBeNull();
  });

  it('does not leak fields outside the contract', () => {
    const node = { ...makeNode(), internalNote: 'secret' };
    expect(Object.keys(mapper.toDto(node)).sort()).toEqual(
      ['budget', 'headcount', 'id', 'name', 'parentId', 'performance', 'updatedAt'],
    );
  });

  it('maps a list preserving order', () => {
    const dtos = mapper.toDtoList([makeNode({ id: 'a' }), makeNode({ id: 'b' })]);
    expect(dtos.map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('maps updated nodes to a live patch message', () => {
    const node = makeNode({
      id: 'd1-1',
      name: 'Платформа',
      parentId: 'd1',
      headcount: 4,
      budget: 6_300_000,
      performance: 86.5,
      updatedAt: new Date('2026-09-15T10:00:00.000Z'),
    });

    expect(mapper.toPatchMessage({ version: 7, nodes: [node] })).toStrictEqual({
      type: 'patch',
      version: 7,
      nodes: [{ id: 'd1-1', headcount: 4, budget: 6_300_000, performance: 86.5, updatedAt: '2026-09-15T10:00:00.000Z' }],
    });
  });
});
