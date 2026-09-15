import styled from 'styled-components'

export const TreeList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

export const Group = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`

export const Item = styled.li`
  margin: 0;
`

export const Row = styled.div<{ $level: number; $selected: boolean; $interactive: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: ${({ theme }) => theme.tree.rowHeightPx}px;
  padding: 4px 12px 4px ${({ theme, $level }) => 8 + ($level - 1) * theme.tree.indentPx}px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $selected }) => ($selected ? theme.colors.selected : 'transparent')};
  box-shadow: ${({ theme, $selected }) => ($selected ? `inset 3px 0 0 ${theme.colors.accent}` : 'none')};
  scroll-margin: 8px;
  cursor: ${({ $interactive }) => ($interactive ? 'pointer' : 'default')};
  user-select: none;

  &:hover {
    background: ${({ theme, $selected }) => ($selected ? theme.colors.selected : theme.colors.surfaceHover)};
  }
`

export const Toggle = styled.button<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(${({ $expanded }) => ($expanded ? '45deg' : '-45deg')});
    transition: transform 0.15s ease;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`

export const ToggleSpacer = styled.span`
  flex-shrink: 0;
  width: 20px;
`

export const Name = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  /* Rendered as a button when the tree is selectable (keyboard access); looks like plain text. */
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: inherit;
`

export const Headcount = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`
