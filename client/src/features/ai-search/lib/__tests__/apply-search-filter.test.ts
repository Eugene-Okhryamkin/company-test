import { describe, expect, it } from 'vitest'
import { buildOrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { applySearchFilter } from '@/features/ai-search/lib/apply-search-filter'
import { EMPTY_SEARCH_FILTER, type SearchFilter } from '@/features/ai-search/model/search-filter.schema'
import { sampleOrgNodes } from '@/test/fixtures'

const { rows } = buildOrgTreeModel(sampleOrgNodes)
// name (level): headcount / budget / performance
// Технологии (1): 21 / 4 000 000 / 63.5    Платформа (2): 12 / 2 000 000 / 46.25
// Core API (3):    9 / 1 000 000 / 40      Дизайн (2):     5 / 1 000 000 / 90
// Продажи (1):     5 / 2 000 000 / 63      Маркетинг (2):  2 / 1 000 000 / 75

const names = (filter: Partial<SearchFilter>) =>
  applySearchFilter(rows, { ...EMPTY_SEARCH_FILTER, ...filter }).map((row) => row.name)

describe('applySearchFilter', () => {
  it('keeps every row, in the given order, for an empty filter', () => {
    expect(names({})).toEqual(['Технологии', 'Платформа', 'Core API', 'Дизайн', 'Продажи', 'Маркетинг'])
  })

  it('matches a name substring case-insensitively, ё ≡ е', () => {
    expect(names({ nameContains: 'core' })).toEqual(['Core API'])
    expect(names({ nameContains: 'ПЛАТФОРМ' })).toEqual(['Платформа'])
  })

  it('keeps only the requested levels', () => {
    expect(names({ levels: [1, 3] })).toEqual(['Технологии', 'Core API', 'Продажи'])
  })

  it('applies inclusive ranges to subtree totals', () => {
    expect(names({ totalHeadcount: { min: 5, max: 12 } })).toEqual(['Платформа', 'Core API', 'Дизайн', 'Продажи'])
    expect(names({ totalBudget: { min: 2_000_000, max: null } })).toEqual(['Технологии', 'Платформа', 'Продажи'])
    expect(names({ avgPerformance: { min: null, max: 46.25 } })).toEqual(['Платформа', 'Core API'])
  })

  it('combines all conditions', () => {
    expect(names({ levels: [2], totalBudget: { min: null, max: 1_000_000 }, avgPerformance: { min: 80, max: null } })).toEqual([
      'Дизайн',
    ])
  })

  it('takes the first N rows by the filter sort ("top N")', () => {
    expect(names({ sort: { key: 'totalHeadcount', direction: 'desc' }, limit: 2 })).toEqual(['Технологии', 'Платформа'])
    expect(names({ levels: [2], sort: { key: 'avgPerformance', direction: 'asc' }, limit: 1 })).toEqual(['Платформа'])
  })

  it('takes the first N rows in hierarchy order when there is no sort', () => {
    expect(names({ limit: 2 })).toEqual(['Технологии', 'Платформа'])
  })

  it('returns the input array itself when nothing is filtered out', () => {
    expect(applySearchFilter(rows, EMPTY_SEARCH_FILTER)).toBe(rows)
  })
})
