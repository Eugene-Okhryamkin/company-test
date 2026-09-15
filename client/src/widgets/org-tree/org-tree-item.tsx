import { memo, useEffect, useId, useRef } from 'react'
import type { OrgTreeNode } from '@/entities/org-node/lib/build-org-tree'
import { PerformanceIndicator } from '@/entities/org-node/ui/performance-indicator'
import { prefersReducedMotion } from '@/shared/lib/prefers-reduced-motion'
import { Collapse } from '@/shared/ui/collapse'
import { FlashOnChange } from '@/shared/ui/flash-on-change'
import { Group, Headcount, Item, Name, Row, Toggle, ToggleSpacer } from '@/widgets/org-tree/org-tree.styles'

interface OrgTreeItemProps {
  treeNode: OrgTreeNode
  selectedId: string | null
  isExpanded: (id: string, level: number) => boolean
  onToggle: (id: string, level: number) => void
  onSelect?: (id: string) => void
}

export const OrgTreeItem = memo(function OrgTreeItem({
  treeNode,
  selectedId,
  isExpanded,
  onToggle,
  onSelect,
}: OrgTreeItemProps) {
  const { node, level, children } = treeNode
  const labelId = useId()
  const rowRef = useRef<HTMLDivElement>(null)
  const hasChildren = children.length > 0
  const expanded = hasChildren && isExpanded(node.id, level)
  const selected = node.id === selectedId
  const interactive = hasChildren || Boolean(onSelect)

  // The whole row is the click target: it toggles a branch and selects the node.
  const handleRowClick = () => {
    if (hasChildren) onToggle(node.id, level)
    onSelect?.(node.id)
  }

  useEffect(() => {
    if (selected) {
      rowRef.current?.scrollIntoView?.({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
  }, [selected])

  return (
    <Item
      role="treeitem"
      aria-level={level}
      aria-labelledby={labelId}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={selected}
    >
      <Row
        ref={rowRef}
        data-testid="org-tree-row"
        $level={level}
        $selected={selected}
        $interactive={interactive}
        onClick={interactive ? handleRowClick : undefined}
      >
        {hasChildren ? (
          <Toggle
            type="button"
            aria-label={`${expanded ? 'Свернуть' : 'Развернуть'} «${node.name}»`}
            $expanded={expanded}
            onClick={(event) => {
              // The arrow only expands/collapses: don't let the row also toggle (or select).
              event.stopPropagation()
              onToggle(node.id, level)
            }}
          />
        ) : (
          <ToggleSpacer aria-hidden="true" />
        )}
        {onSelect ? (
          // A real button keeps selection reachable from the keyboard; its click bubbles to the row.
          <Name as="button" type="button" id={labelId}>
            {node.name}
          </Name>
        ) : (
          <Name id={labelId}>{node.name}</Name>
        )}
        <Headcount>
          <FlashOnChange value={node.headcount}>{node.headcount} чел.</FlashOnChange>
        </Headcount>
        <PerformanceIndicator value={node.performance} />
      </Row>

      {hasChildren && (
        <Collapse open={expanded}>
          <Group role="group">
            {children.map((child) => (
              <OrgTreeItem
                key={child.node.id}
                treeNode={child}
                selectedId={selectedId}
                isExpanded={isExpanded}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </Group>
        </Collapse>
      )}
    </Item>
  )
})
