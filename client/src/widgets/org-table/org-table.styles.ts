import styled, { css } from 'styled-components'

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 12px;
`

export const SearchInput = styled.input`
  flex: 1 1 240px;
  max-width: 360px;
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  font: inherit;
  color: inherit;
  background: ${({ theme }) => theme.colors.surface};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`

export const Count = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-variant-numeric: tabular-nums;
`

export const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-variant-numeric: tabular-nums;
`

const alignment = css<{ $align: 'start' | 'end' }>`
  text-align: ${({ $align }) => ($align === 'end' ? 'right' : 'left')};
`

export const HeaderCell = styled.th<{ $align: 'start' | 'end' }>`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  font-weight: 600;
  vertical-align: bottom;
  ${alignment}
`

export const SortButton = styled.button<{ $align: 'start' | 'end'; $direction: 'asc' | 'desc' | null }>`
  display: inline-flex;
  flex-direction: ${({ $align }) => ($align === 'end' ? 'row-reverse' : 'row')};
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 10px;
  line-height: 1.3;
  border: none;
  background: transparent;
  font: inherit;
  font-weight: inherit;
  color: inherit;
  cursor: pointer;
  user-select: none;
  text-align: inherit;

  &::after {
    content: '';
    flex-shrink: 0;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    ${({ $direction, theme }) =>
      $direction === 'desc'
        ? css`border-top: 5px solid ${theme.colors.accent};`
        : css`border-bottom: 5px solid ${$direction ? theme.colors.accent : theme.colors.border};`}
  }

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`

export const BodyRow = styled.tr<{ $selected: boolean }>`
  cursor: pointer;
  background: ${({ theme, $selected }) => ($selected ? theme.colors.selected : 'transparent')};

  &:hover {
    background: ${({ theme, $selected }) => ($selected ? theme.colors.selected : theme.colors.surfaceHover)};
  }

  & > td:first-child {
    box-shadow: ${({ theme, $selected }) => ($selected ? `inset 3px 0 0 ${theme.colors.accent}` : 'none')};
  }
`

export const Cell = styled.td<{ $align: 'start' | 'end' }>`
  padding: 8px 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  ${alignment}
`

export const PerformanceValue = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

export const EmptyCell = styled.td`
  padding: 32px 10px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
`
