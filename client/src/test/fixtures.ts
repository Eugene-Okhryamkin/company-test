import type { OrgNode } from '@/entities/org-node/model/org-node.schema'

export function makeOrgNode(overrides: Partial<OrgNode> = {}): OrgNode {
  return {
    id: 'n1',
    name: 'Узел',
    parentId: null,
    headcount: 10,
    budget: 1_000_000,
    performance: 75,
    updatedAt: '2026-09-01T09:00:00.000Z',
    ...overrides,
  }
}

/** Small 3-level tree: 2 divisions → departments → teams. */
export const sampleOrgNodes: OrgNode[] = [
  makeOrgNode({ id: 'd1', name: 'Технологии', headcount: 4, performance: 82 }),
  makeOrgNode({ id: 'd1-1', name: 'Платформа', parentId: 'd1', headcount: 3, performance: 65 }),
  makeOrgNode({ id: 'd1-1-1', name: 'Core API', parentId: 'd1-1', headcount: 9, performance: 40 }),
  makeOrgNode({ id: 'd1-2', name: 'Дизайн', parentId: 'd1', headcount: 5, performance: 90 }),
  makeOrgNode({ id: 'd2', name: 'Продажи', headcount: 3, performance: 55 }),
  makeOrgNode({ id: 'd2-1', name: 'Маркетинг', parentId: 'd2', headcount: 2, performance: 75 }),
]
