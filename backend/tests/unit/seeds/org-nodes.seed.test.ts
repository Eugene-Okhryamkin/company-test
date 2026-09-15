import { describe, expect, it } from 'vitest';
import { orgNodesSeed } from '@/seeds/org-nodes.seed.js';
import { validateOrgNodes } from '@/services/org-tree.validator.js';

function maxDepth(nodes: typeof orgNodesSeed): number {
  const parentOf = new Map(nodes.map((n) => [n.id, n.parentId]));
  let max = 0;
  for (const node of nodes) {
    let depth = 1;
    let parent = node.parentId;
    while (parent !== null) {
      depth += 1;
      parent = parentOf.get(parent) ?? null;
    }
    max = Math.max(max, depth);
  }
  return max;
}

describe('orgNodesSeed', () => {
  it('contains at least 40 nodes', () => {
    expect(orgNodesSeed.length).toBeGreaterThanOrEqual(40);
  });

  it('has at least three levels of nesting', () => {
    expect(maxDepth(orgNodesSeed)).toBeGreaterThanOrEqual(3);
  });

  it('has several root divisions', () => {
    expect(orgNodesSeed.filter((n) => n.parentId === null).length).toBeGreaterThan(1);
  });

  it('satisfies all tree integrity rules', () => {
    expect(() => validateOrgNodes(orgNodesSeed)).not.toThrow();
  });
});
