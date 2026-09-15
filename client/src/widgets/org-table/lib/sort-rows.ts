import type { OrgTableRow } from '@/entities/org-node/lib/org-tree-model'

export type SortKey = 'name' | 'level' | 'totalHeadcount' | 'totalBudget' | 'avgPerformance'
export type SortDirection = 'asc' | 'desc'
export type SortState = { key: SortKey; direction: SortDirection } | null

const nameCollator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true })

function compareBy(key: SortKey, a: OrgTableRow, b: OrgTableRow): number {
  return key === 'name' ? nameCollator.compare(a.name, b.name) : a[key] - b[key]
}

/** Returns a new sorted array. Ties (and "no sort") fall back to hierarchy order. */
export function sortRows(rows: readonly OrgTableRow[], sort: SortState): OrgTableRow[] {
  const sign = sort?.direction === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const primary = sort ? sign * compareBy(sort.key, a, b) : 0
    return primary !== 0 ? primary : a.order - b.order
  })
}

/** Header activation: a new column sorts ascending, the active column reverses. */
export function applySortToggle(state: SortState, key: SortKey): SortState {
  if (state?.key !== key) return { key, direction: 'asc' }
  return { key, direction: state.direction === 'asc' ? 'desc' : 'asc' }
}
