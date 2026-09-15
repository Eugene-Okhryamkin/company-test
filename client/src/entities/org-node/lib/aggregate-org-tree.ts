import type { OrgTreeNode } from '@/entities/org-node/lib/build-org-tree'

/** Totals for a node together with all of its descendants. */
export interface OrgUnitStats {
  totalHeadcount: number
  totalBudget: number
  /** Headcount-weighted mean over the subtree; plain mean if the subtree has no employees. */
  avgPerformance: number
  /** Σ performance × headcount — kept so ancestors can be updated incrementally (stage 03). */
  performanceWeight: number
  /** Σ performance — for the zero-headcount fallback. */
  performanceSum: number
  nodeCount: number
}

/**
 * Aggregates every subtree in O(n) with an iterative post-order walk
 * (no recursion → safe for arbitrarily deep trees).
 */
export function aggregateOrgTree(forest: readonly OrgTreeNode[]): Map<string, OrgUnitStats> {
  // Pre-order: every node appears before all of its descendants.
  const preOrder: OrgTreeNode[] = []
  const stack = [...forest]
  while (stack.length > 0) {
    const treeNode = stack.pop()!
    preOrder.push(treeNode)
    for (const child of treeNode.children) stack.push(child)
  }

  const stats = new Map<string, OrgUnitStats>()
  // Reverse pre-order visits children before their parent.
  for (let index = preOrder.length - 1; index >= 0; index -= 1) {
    const { node, children } = preOrder[index]!
    let totalHeadcount = node.headcount
    let totalBudget = node.budget
    let performanceWeight = node.performance * node.headcount
    let performanceSum = node.performance
    let nodeCount = 1

    for (const child of children) {
      const childStats = stats.get(child.node.id)!
      totalHeadcount += childStats.totalHeadcount
      totalBudget += childStats.totalBudget
      performanceWeight += childStats.performanceWeight
      performanceSum += childStats.performanceSum
      nodeCount += childStats.nodeCount
    }

    stats.set(node.id, {
      totalHeadcount,
      totalBudget,
      avgPerformance: totalHeadcount > 0 ? performanceWeight / totalHeadcount : performanceSum / nodeCount,
      performanceWeight,
      performanceSum,
      nodeCount,
    })
  }

  return stats
}
