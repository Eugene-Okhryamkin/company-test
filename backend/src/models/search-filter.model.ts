/**
 * Structured search filter produced from a natural-language query.
 * It is applied on the client to the analytics table rows, so every numeric field refers
 * to the values the table shows: subtree totals and the weighted average performance.
 */

/** Hierarchy depth: 1 — division, 2 — department, 3 — team. */
export const ORG_LEVELS = [1, 2, 3] as const;
export type OrgLevel = (typeof ORG_LEVELS)[number];

export const SEARCH_SORT_KEYS = ['name', 'level', 'totalHeadcount', 'totalBudget', 'avgPerformance'] as const;
export type SearchSortKey = (typeof SEARCH_SORT_KEYS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** Inclusive bounds; null means "no bound". */
export interface NumericRange {
  min: number | null;
  max: number | null;
}

export interface SearchFilter {
  /** Case-insensitive substring of the unit name. */
  nameContains: string | null;
  /** Allowed hierarchy levels; empty — any level. */
  levels: OrgLevel[];
  totalHeadcount: NumericRange;
  /** Roubles. */
  totalBudget: NumericRange;
  /** 0–100. */
  avgPerformance: NumericRange;
  sort: { key: SearchSortKey; direction: SortDirection } | null;
  /** Keep only the first N rows (after sorting), e.g. "top 5". */
  limit: number | null;
}
