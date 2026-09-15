import { describe, expect, it } from 'vitest'
import { describeSearchFilter } from '@/features/ai-search/lib/describe-search-filter'
import { EMPTY_SEARCH_FILTER } from '@/features/ai-search/model/search-filter.schema'

describe('describeSearchFilter', () => {
  it('describes every condition in plain Russian', () => {
    expect(
      describeSearchFilter({
        nameContains: 'Core',
        levels: [2, 3],
        totalHeadcount: { min: 10, max: null },
        totalBudget: { min: 1_000_000, max: 5_500_000 },
        avgPerformance: { min: null, max: 59.5 },
        sort: { key: 'totalBudget', direction: 'desc' },
        limit: 5,
      }),
    ).toEqual([
      'Название содержит «Core»',
      'Уровень: отделы, команды',
      'Сотрудников: от 10',
      'Бюджет: от 1 000 000 до 5 500 000 руб.',
      'Эффективность: до 59,5',
      'Сортировка: бюджет ↓',
      'Первые 5',
    ])
  })

  it('names each level and sort direction', () => {
    expect(describeSearchFilter({ ...EMPTY_SEARCH_FILTER, levels: [1], sort: { key: 'name', direction: 'asc' } })).toEqual([
      'Уровень: дивизионы',
      'Сортировка: название ↑',
    ])
  })

  it('says so when the filter has no conditions', () => {
    expect(describeSearchFilter(EMPTY_SEARCH_FILTER)).toEqual(['Без условий — показаны все подразделения'])
  })
})
