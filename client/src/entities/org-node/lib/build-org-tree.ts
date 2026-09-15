import type { OrgNode } from '@/entities/org-node/model/org-node.schema'

export interface OrgTreeNode {
  node: OrgNode
  /** 1 = division, 2 = department, 3 = team, … */
  level: number
  children: OrgTreeNode[]
}

/**
 * Turns the flat API list into a forest. O(n): one pass to index, one to link,
 * one DFS to assign levels. Input order is preserved among siblings.
 * Assumes a validated list (see orgTreeResponseSchema).
 */
export function buildOrgTree(nodes: readonly OrgNode[]): OrgTreeNode[] {
  const byId = new Map<string, OrgTreeNode>()
  for (const node of nodes) {
    byId.set(node.id, { node, level: 0, children: [] })
  }

  const roots: OrgTreeNode[] = []
  for (const node of nodes) {
    const treeNode = byId.get(node.id)!
    const parent = node.parentId === null ? undefined : byId.get(node.parentId)
    if (parent) parent.children.push(treeNode)
    else roots.push(treeNode)
  }

  const stack = roots.map((root) => ({ treeNode: root, level: 1 }))
  while (stack.length > 0) {
    const { treeNode, level } = stack.pop()!
    treeNode.level = level
    for (const child of treeNode.children) stack.push({ treeNode: child, level: level + 1 })
  }

  return roots
}
