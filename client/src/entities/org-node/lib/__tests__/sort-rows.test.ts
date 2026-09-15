import { describe, expect, it } from 'vitest'
import type { OrgTableRow } from '@/entities/org-node/lib/org-tree-model'
import { applySortToggle, sortRows, type SortState } from '@/widgets/org-table/lib/sort-rows'

const row = (overrides: Partial<OrgTableRow>): OrgTableRow => ({
  id: 'x',
  name: 'x',
  level: 1,
  totalHeadcount: 0,
  totalBudget: 0,
  avgPerformance: 0,
  order: 0,
  ...overrides,
})

const rows: OrgTableRow[] = [
  row({ id: 'a', name: 'Бухгалтерия', level: 2, totalHeadcount: 7, totalBudget: 300, avgPerformance: 85, order: 0 }),
  row({ id: 'b', name: 'аналитика', level: 1, totalHeadcount: 20, totalBudget: 100, avgPerformance: 60.5, order: 1 }),
  row({ id: 'c', name: 'Core API', level: 3, totalHeadcount: 7, totalBudget: 200, avgPerformance: 90, order: 2 }),
  row({ id: 'd', name: 'Ёлка', level: 2, totalHeadcount: 3, totalBudget: 200, avgPerformance: 60.4, order: 3 }),
]
const ids = (sorted: OrgTableRow[]) => sorted.map((r) => r.id)

describe('sortRows', () => {
  it('keeps hierarchy order when there is no sort', () => {
    expect(ids(sortRows([...rows].reverse(), null))).toEqual(['a', 'b', 'c', 'd'])
  })

  it.each<[SortState, string[]]>([
    [{ key: 'totalHeadcount', direction: 'asc' }, ['d', 'a', 'c', 'b']],
    [{ key: 'totalHeadcount', direction: 'desc' }, ['b', 'a', 'c', 'd']],
    [{ key: 'totalBudget', direction: 'asc' }, ['b', 'c', 'd', 'a']],
    [{ key: 'avgPerformance', direction: 'asc' }, ['d', 'b', 'a', 'c']],
    [{ key: 'level', direction: 'desc' }, ['c', 'a', 'd', 'b']],
  ])('sorts by %j', (sort, expected) => {
    expect(ids(sortRows(rows, sort))).toEqual(expected)
  })

  it('sorts names case-insensitively with Russian collation (Cyrillic before Latin, ё next to е)', () => {
    expect(ids(sortRows(rows, { key: 'name', direction: 'asc' }))).toEqual(['b', 'a', 'd', 'c'])
    expect(ids(sortRows(rows, { key: 'name', direction: 'desc' }))).toEqual(['c', 'd', 'a', 'b'])
  })

  it('breaks ties by hierarchy order in both directions (stable)', () => {
    // a and c both have 7 employees; c and d share a budget of 200
    expect(ids(sortRows(rows, { key: 'totalHeadcount', direction: 'desc' })).slice(1, 3)).toEqual(['a', 'c'])
    expect(ids(sortRows(rows, { key: 'totalBudget', direction: 'desc' })).slice(1, 3)).toEqual(['c', 'd'])
  })

  it('does not mutate the input', () => {
    const input = [...rows]
    sortRows(input, { key: 'name', direction: 'asc' })
    expect(input).toEqual(rows)
  })
})

describe('applySortToggle', () => {
  it('sorts a new column ascending', () => {
    expect(applySortToggle(null, 'name')).toEqual({ key: 'name', direction: 'asc' })
    expect(applySortToggle({ key: 'level', direction: 'desc' }, 'name')).toEqual({ key: 'name', direction: 'asc' })
  })

  it('reverses the active column', () => {
    expect(applySortToggle({ key: 'name', direction: 'asc' }, 'name')).toEqual({ key: 'name', direction: 'desc' })
    expect(applySortToggle({ key: 'name', direction: 'desc' }, 'name')).toEqual({ key: 'name', direction: 'asc' })
  })
})
