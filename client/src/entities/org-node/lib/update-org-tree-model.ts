import { computeUnitStats, type OrgUnitStats } from '@/entities/org-node/lib/aggregate-org-tree'
import type { OrgTreeNode } from '@/entities/org-node/lib/build-org-tree'
import type { OrgTableRow, OrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import type { OrgNode } from '@/entities/org-node/model/org-node.schema'

/**
 * Incremental model update for live patches (metrics only; the structure is unchanged).
 *
 * Only the changed nodes and their ancestors are recomputed — bottom-up, from their children's
 * stats — with the same arithmetic as the full aggregation. Everything off that path keeps its
 * object identity, so memoised tree items and table rows outside the path do not re-render.
 * Cost: O(|path| · children) for stats; the new Map/array containers copy references only.
 */
export function updateOrgTreeModel(model: OrgTreeModel, changedNodes: readonly OrgNode[]): OrgTreeModel {
  if (changedNodes.length === 0) return model

  const changedById = new Map(changedNodes.map((node) => [node.id, node]))

  // Changed nodes + all their ancestors.
  const affected = new Map<string, OrgTreeNode>()
  for (const { id } of changedNodes) {
    let current = model.byId.get(id)
    if (!current) throw new Error(`Cannot patch unknown org node "${id}"`)
    while (current && !affected.has(current.node.id)) {
      affected.set(current.node.id, current)
      current = current.node.parentId === null ? undefined : model.byId.get(current.node.parentId)
    }
  }

  // Deepest first → children are rebuilt before their parents.
  const ordered = [...affected.values()].sort((a, b) => b.level - a.level)

  const byId = new Map(model.byId)
  const stats = new Map<string, OrgUnitStats>(model.stats)
  for (const previous of ordered) {
    const id = previous.node.id
    const children = previous.children.map((child) => byId.get(child.node.id)!)
    const next: OrgTreeNode = { node: changedById.get(id) ?? previous.node, level: previous.level, children }
    byId.set(id, next)
    stats.set(id, computeUnitStats(next.node, children.map((child) => stats.get(child.node.id)!)))
  }

  const forest = model.forest.map((root) => byId.get(root.node.id)!)
  const rows = model.rows.map((row): OrgTableRow => {
    if (!affected.has(row.id)) return row
    const { node } = byId.get(row.id)!
    const rowStats = stats.get(row.id)!
    return {
      ...row,
      name: node.name,
      totalHeadcount: rowStats.totalHeadcount,
      totalBudget: rowStats.totalBudget,
      avgPerformance: rowStats.avgPerformance,
    }
  })

  return { forest, byId, stats, rows }
}
