import type { OrgTableRow } from '@/entities/org-node/lib/org-tree-model'
import { normalizeSearchText } from '@/shared/lib/normalize-search-text'

/** Case-insensitive substring match on the name; ё ≡ е. Blank query returns the input as-is. */
export function filterRowsByName(rows: readonly OrgTableRow[], query: string): readonly OrgTableRow[] {
  const needle = normalizeSearchText(query)
  if (needle === '') return rows
  return rows.filter((row) => normalizeSearchText(row.name).includes(needle))
}
