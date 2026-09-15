/** Canonical form for substring search: trimmed, lower-case (ru), ё ≡ е. */
export const normalizeSearchText = (text: string): string => text.trim().toLocaleLowerCase('ru').replaceAll('ё', 'е')
