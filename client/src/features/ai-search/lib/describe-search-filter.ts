import type { SortKey } from '@/entities/org-node/lib/sort-rows'
import type { SearchFilter } from '@/features/ai-search/model/search-filter.schema'
import { formatNumber } from '@/shared/lib/format'

const LEVEL_NAMES: Record<number, string> = { 1: 'дивизионы', 2: 'отделы', 3: 'команды' }

const SORT_NAMES: Record<SortKey, string> = {
  name: 'название',
  level: 'уровень',
  totalHeadcount: 'сотрудники',
  totalBudget: 'бюджет',
  avgPerformance: 'эффективность',
}

const formatDecimal = (value: number) => String(Math.round(value * 100) / 100).replace('.', ',')

function describeRange(label: string, { min, max }: SearchFilter['totalBudget'], format: (value: number) => string, unit = '') {
  if (min === null && max === null) return null
  const parts = [min !== null ? `от ${format(min)}` : null, max !== null ? `до ${format(max)}` : null]
  return `${label}: ${parts.filter(Boolean).join(' ')}${unit}`
}

/** Human-readable conditions of the filter, so the user can see how the query was understood. */
export function describeSearchFilter(filter: SearchFilter): string[] {
  const items = [
    filter.nameContains !== null ? `Название содержит «${filter.nameContains}»` : null,
    filter.levels.length > 0 ? `Уровень: ${filter.levels.map((level) => LEVEL_NAMES[level]).join(', ')}` : null,
    describeRange('Сотрудников', filter.totalHeadcount, formatNumber),
    describeRange('Бюджет', filter.totalBudget, formatNumber, ' руб.'),
    describeRange('Эффективность', filter.avgPerformance, formatDecimal),
    filter.sort !== null ? `Сортировка: ${SORT_NAMES[filter.sort.key]} ${filter.sort.direction === 'asc' ? '↑' : '↓'}` : null,
    filter.limit !== null ? `Первые ${filter.limit}` : null,
  ].filter((item): item is string => item !== null)

  return items.length > 0 ? items : ['Без условий — показаны все подразделения']
}
