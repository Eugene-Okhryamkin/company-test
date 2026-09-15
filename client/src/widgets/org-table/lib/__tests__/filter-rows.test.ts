import { describe, expect, it } from 'vitest'
import type { OrgTableRow } from '@/entities/org-node/lib/org-tree-model'
import { filterRowsByName } from '@/widgets/org-table/lib/filter-rows'

const rows = ['Технологии', 'Платформа', 'Core API', 'Продажи и маркетинг', 'Ёлочные игрушки'].map(
  (name, order): OrgTableRow => ({
    id: String(order),
    name,
    level: 1,
    totalHeadcount: 0,
    totalBudget: 0,
    avgPerformance: 0,
    order,
  }),
)
const names = (result: readonly OrgTableRow[]) => result.map((r) => r.name)

describe('filterRowsByName', () => {
  it('returns all rows (same array) for an empty or blank query', () => {
    expect(filterRowsByName(rows, '')).toBe(rows)
    expect(filterRowsByName(rows, '   ')).toBe(rows)
  })

  it('matches a substring anywhere in the name, case-insensitively', () => {
    expect(names(filterRowsByName(rows, 'ФОРМ'))).toEqual(['Платформа'])
    expect(names(filterRowsByName(rows, 'api'))).toEqual(['Core API'])
    expect(names(filterRowsByName(rows, 'и'))).toEqual(['Технологии', 'Продажи и маркетинг', 'Ёлочные игрушки'])
  })

  it('trims the query', () => {
    expect(names(filterRowsByName(rows, '  продажи '))).toEqual(['Продажи и маркетинг'])
  })

  it('treats ё and е as the same letter', () => {
    expect(names(filterRowsByName(rows, 'елочн'))).toEqual(['Ёлочные игрушки'])
    expect(names(filterRowsByName(rows, 'маркётинг'))).toEqual(['Продажи и маркетинг'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterRowsByName(rows, 'бухгалтерия')).toEqual([])
  })
})
