import type { OrgTableRow } from '@/entities/org-node/lib/org-tree-model'

const normalize = (text: string) => text.toLocaleLowerCase('ru').replaceAll('ё', 'е')

/** Case-insensitive substring match on the name; ё ≡ е. Blank query returns the input as-is. */
export function filterRowsByName(rows: readonly OrgTableRow[], query: string): readonly OrgTableRow[] {
  const needle = normalize(query.trim())
  if (needle === '') return rows
  return rows.filter((row) => normalize(row.name).includes(needle))
}
