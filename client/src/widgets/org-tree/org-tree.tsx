import { useMemo } from 'react'
import { buildOrgTree } from '@/entities/org-node/lib/build-org-tree'
import type { OrgNode } from '@/entities/org-node/model/org-node.schema'
import { OrgTreeItem } from '@/widgets/org-tree/org-tree-item'
import { TreeList } from '@/widgets/org-tree/org-tree.styles'
import { useTreeExpansion } from '@/widgets/org-tree/use-tree-expansion'

interface OrgTreeProps {
  nodes: readonly OrgNode[]
}

export function OrgTree({ nodes }: OrgTreeProps) {
  // Rebuilt only when the cache hands out a new data reference (i.e. data really changed).
  const forest = useMemo(() => buildOrgTree(nodes), [nodes])
  const { isExpanded, toggle } = useTreeExpansion()

  return (
    <TreeList role="tree" aria-label="Оргструктура">
      {forest.map((treeNode) => (
        <OrgTreeItem key={treeNode.node.id} treeNode={treeNode} isExpanded={isExpanded} onToggle={toggle} />
      ))}
    </TreeList>
  )
}
