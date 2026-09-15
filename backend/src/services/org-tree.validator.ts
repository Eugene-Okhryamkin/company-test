import type { OrgNode } from '@/models/org-node.model.js';

export class OrgTreeIntegrityError extends Error {
  constructor(message: string) {
    super(`Org tree integrity violation: ${message}`);
    this.name = 'OrgTreeIntegrityError';
  }
}

function validateFields(node: OrgNode): void {
  const ref = `node "${node.id}"`;

  if (typeof node.id !== 'string' || node.id.trim() === '') {
    throw new OrgTreeIntegrityError('node id must be a non-empty string');
  }
  if (typeof node.name !== 'string' || node.name.trim() === '') {
    throw new OrgTreeIntegrityError(`${ref}: name must be a non-empty string`);
  }
  if (!Number.isInteger(node.headcount) || node.headcount < 0) {
    throw new OrgTreeIntegrityError(`${ref}: headcount must be a non-negative integer`);
  }
  if (!Number.isFinite(node.budget) || node.budget < 0) {
    throw new OrgTreeIntegrityError(`${ref}: budget must be a non-negative finite number`);
  }
  if (!Number.isFinite(node.performance) || node.performance < 0 || node.performance > 100) {
    throw new OrgTreeIntegrityError(`${ref}: performance must be within 0–100`);
  }
  if (!(node.updatedAt instanceof Date) || Number.isNaN(node.updatedAt.getTime())) {
    throw new OrgTreeIntegrityError(`${ref}: updatedAt must be a valid date`);
  }
}

/**
 * Checks that a flat list forms a valid forest:
 * valid fields, unique ids, existing parents and no cycles. O(n).
 */
export function validateOrgNodes(nodes: readonly OrgNode[]): void {
  const parentById = new Map<string, string | null>();

  for (const node of nodes) {
    validateFields(node);
    if (parentById.has(node.id)) {
      throw new OrgTreeIntegrityError(`duplicate id "${node.id}"`);
    }
    parentById.set(node.id, node.parentId);
  }

  for (const node of nodes) {
    if (node.parentId !== null && !parentById.has(node.parentId)) {
      throw new OrgTreeIntegrityError(`node "${node.id}" references unknown parent "${node.parentId}"`);
    }
  }

  // Cycle detection: walk up from each node; nodes proven to reach a root are memoised.
  const reachesRoot = new Set<string>();
  for (const node of nodes) {
    const path = new Set<string>();
    let current: string | null = node.id;

    while (current !== null && !reachesRoot.has(current)) {
      if (path.has(current)) {
        throw new OrgTreeIntegrityError(`cycle detected at node "${current}"`);
      }
      path.add(current);
      current = parentById.get(current) ?? null;
    }
    for (const id of path) reachesRoot.add(id);
  }
}
