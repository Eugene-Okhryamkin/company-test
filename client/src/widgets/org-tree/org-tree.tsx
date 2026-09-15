import { useState } from 'react'
import { getAncestorIds, type OrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { OrgTreeItem } from '@/widgets/org-tree/org-tree-item'
import { TreeList } from '@/widgets/org-tree/org-tree.styles'
import { useTreeExpansion } from '@/widgets/org-tree/use-tree-expansion'

interface OrgTreeProps {
  model: OrgTreeModel
  selectedId?: string | null
  onSelect?: (id: string) => void
}

export function OrgTree({ model, selectedId = null, onSelect }: OrgTreeProps) {
  const { isExpanded, toggle, expand } = useTreeExpansion()

  // When the selection changes, open its ancestors during render (no flash of a hidden node).
  // Tracking the last revealed id keeps the user free to collapse those branches afterwards.
  const [revealedId, setRevealedId] = useState<string | null>(null)
  if (selectedId !== revealedId) {
    setRevealedId(selectedId)
    if (selectedId !== null) expand(getAncestorIds(model, selectedId))
  }

  return (
    <TreeList role="tree" aria-label="Оргструктура">
      {model.forest.map((treeNode) => (
        <OrgTreeItem
          key={treeNode.node.id}
          treeNode={treeNode}
          selectedId={selectedId}
          isExpanded={isExpanded}
          onToggle={toggle}
          onSelect={onSelect}
        />
      ))}
    </TreeList>
  )
}
