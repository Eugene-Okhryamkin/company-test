import type { OrgNode } from '@/models/org-node.model.js';

export function makeNode(overrides: Partial<OrgNode> = {}): OrgNode {
  return {
    id: 'n1',
    name: 'Узел',
    parentId: null,
    headcount: 10,
    budget: 1_000_000,
    performance: 75,
    updatedAt: new Date('2026-09-01T09:00:00.000Z'),
    ...overrides,
  };
}
