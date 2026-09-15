import type { OrgTreeNode } from '@/entities/org-node/lib/build-org-tree'
import type { OrgNode } from '@/entities/org-node/model/org-node.schema'

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
 * Stats of one node from its own values and its children's stats. Shared by the full and the
 * incremental aggregation, so both produce bit-identical results.
 */
export function computeUnitStats(node: OrgNode, childStats: readonly OrgUnitStats[]): OrgUnitStats {
  let totalHeadcount = node.headcount
  let totalBudget = node.budget
  let performanceWeight = node.performance * node.headcount
  let performanceSum = node.performance
  let nodeCount = 1

  for (const child of childStats) {
    totalHeadcount += child.totalHeadcount
    totalBudget += child.totalBudget
    performanceWeight += child.performanceWeight
    performanceSum += child.performanceSum
    nodeCount += child.nodeCount
  }

  return {
    totalHeadcount,
    totalBudget,
    avgPerformance: totalHeadcount > 0 ? performanceWeight / totalHeadcount : performanceSum / nodeCount,
    performanceWeight,
    performanceSum,
    nodeCount,
  }
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
    stats.set(node.id, computeUnitStats(node, children.map((child) => stats.get(child.node.id)!)))
  }

  return stats
}
