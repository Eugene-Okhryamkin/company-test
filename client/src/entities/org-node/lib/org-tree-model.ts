import { aggregateOrgTree, type OrgUnitStats } from '@/entities/org-node/lib/aggregate-org-tree'
import { buildOrgTree, type OrgTreeNode } from '@/entities/org-node/lib/build-org-tree'
import type { OrgNode } from '@/entities/org-node/model/org-node.schema'

/** One line of the analytics table. */
export interface OrgTableRow {
  id: string
  name: string
  level: number
  totalHeadcount: number
  totalBudget: number
  avgPerformance: number
  /** Position in hierarchy (depth-first) order; default order and sort tie-breaker. */
  order: number
}

/** Everything the tree and the table need, derived once from the API data. */
export interface OrgTreeModel {
  forest: readonly OrgTreeNode[]
  byId: ReadonlyMap<string, OrgTreeNode>
  stats: ReadonlyMap<string, OrgUnitStats>
  rows: readonly OrgTableRow[]
}

export function buildOrgTreeModel(nodes: readonly OrgNode[]): OrgTreeModel {
  const forest = buildOrgTree(nodes)
  const stats = aggregateOrgTree(forest)
  const byId = new Map<string, OrgTreeNode>()
  const rows: OrgTableRow[] = []

  // Iterative depth-first walk that preserves sibling order.
  const stack = [...forest].reverse()
  while (stack.length > 0) {
    const treeNode = stack.pop()!
    const { node, level, children } = treeNode
    const nodeStats = stats.get(node.id)!

    byId.set(node.id, treeNode)
    rows.push({
      id: node.id,
      name: node.name,
      level,
      totalHeadcount: nodeStats.totalHeadcount,
      totalBudget: nodeStats.totalBudget,
      avgPerformance: nodeStats.avgPerformance,
      order: rows.length,
    })
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]!)
  }

  return { forest, byId, stats, rows }
}

const modelCache = new WeakMap<readonly OrgNode[], OrgTreeModel>()

/**
 * Memoised by data reference: TanStack Query keeps the reference while data is unchanged
 * (structural sharing), so aggregation runs exactly once per real change — no matter how
 * many components read the model.
 */
export function getOrgTreeModel(nodes: readonly OrgNode[]): OrgTreeModel {
  let model = modelCache.get(nodes)
  if (!model) {
    model = buildOrgTreeModel(nodes)
    modelCache.set(nodes, model)
  }
  return model
}

/** Model already computed for this data reference, if any (no computation). */
export const peekOrgTreeModel = (nodes: readonly OrgNode[]): OrgTreeModel | undefined => modelCache.get(nodes)

/** Registers a model computed elsewhere (e.g. incrementally from a live patch) for a data reference. */
export function primeOrgTreeModel(nodes: readonly OrgNode[], model: OrgTreeModel): void {
  modelCache.set(nodes, model)
}

/** Ancestor ids from the root down to the direct parent. */
export function getAncestorIds(model: OrgTreeModel, id: string): string[] {
  const ancestors: string[] = []
  let parentId = model.byId.get(id)?.node.parentId ?? null
  while (parentId !== null) {
    ancestors.unshift(parentId)
    parentId = model.byId.get(parentId)?.node.parentId ?? null
  }
  return ancestors
}
