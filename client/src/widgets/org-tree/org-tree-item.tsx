import { memo, useId } from 'react'
import type { OrgTreeNode } from '@/entities/org-node/lib/build-org-tree'
import { PerformanceIndicator } from '@/entities/org-node/ui/performance-indicator'
import { Group, Headcount, Item, Name, Row, Toggle, ToggleSpacer } from '@/widgets/org-tree/org-tree.styles'

interface OrgTreeItemProps {
  treeNode: OrgTreeNode
  isExpanded: (id: string, level: number) => boolean
  onToggle: (id: string, level: number) => void
}

export const OrgTreeItem = memo(function OrgTreeItem({ treeNode, isExpanded, onToggle }: OrgTreeItemProps) {
  const { node, level, children } = treeNode
  const labelId = useId()
  const hasChildren = children.length > 0
  const expanded = hasChildren && isExpanded(node.id, level)

  return (
    <Item
      role="treeitem"
      aria-level={level}
      aria-labelledby={labelId}
      aria-expanded={hasChildren ? expanded : undefined}
    >
      <Row data-testid="org-tree-row" $level={level}>
        {hasChildren ? (
          <Toggle
            type="button"
            aria-label={`${expanded ? 'Свернуть' : 'Развернуть'} «${node.name}»`}
            $expanded={expanded}
            onClick={() => onToggle(node.id, level)}
          />
        ) : (
          <ToggleSpacer aria-hidden="true" />
        )}
        <Name id={labelId}>{node.name}</Name>
        <Headcount>{node.headcount} чел.</Headcount>
        <PerformanceIndicator value={node.performance} />
      </Row>

      {expanded && (
        <Group role="group">
          {children.map((child) => (
            <OrgTreeItem key={child.node.id} treeNode={child} isExpanded={isExpanded} onToggle={onToggle} />
          ))}
        </Group>
      )}
    </Item>
  )
})
