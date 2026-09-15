import type { OrgTableRow } from '@/entities/org-node/lib/org-tree-model'
import { sortRows } from '@/entities/org-node/lib/sort-rows'
import type { SearchFilter } from '@/features/ai-search/model/search-filter.schema'
import { normalizeSearchText } from '@/shared/lib/normalize-search-text'

type Range = SearchFilter['totalBudget']

const inRange = (value: number, { min, max }: Range) => (min === null || value >= min) && (max === null || value <= max)
const isUnbounded = ({ min, max }: Range) => min === null && max === null

/**
 * Applies an AI-produced structured filter to table rows. Pure and synchronous: the LLM only
 * translates the query, the data never leaves the client and live patches are re-filtered instantly.
 * With `limit`, the first N rows by the filter's own sort are kept ("top 5 by budget");
 * the table may then re-order them.
 */
export function applySearchFilter(rows: readonly OrgTableRow[], filter: SearchFilter): readonly OrgTableRow[] {
  const needle = filter.nameContains === null ? '' : normalizeSearchText(filter.nameContains)
  const levels = new Set<number>(filter.levels)
  const hasConditions =
    needle !== '' ||
    levels.size > 0 ||
    !isUnbounded(filter.totalHeadcount) ||
    !isUnbounded(filter.totalBudget) ||
    !isUnbounded(filter.avgPerformance)

  const matching = hasConditions
    ? rows.filter(
        (row) =>
          (needle === '' || normalizeSearchText(row.name).includes(needle)) &&
          (levels.size === 0 || levels.has(row.level)) &&
          inRange(row.totalHeadcount, filter.totalHeadcount) &&
          inRange(row.totalBudget, filter.totalBudget) &&
          inRange(row.avgPerformance, filter.avgPerformance),
      )
    : rows

  if (filter.limit === null) return matching
  return sortRows(matching, filter.sort).slice(0, filter.limit)
}
