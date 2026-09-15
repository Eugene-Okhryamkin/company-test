import { z } from 'zod'
import type { SortKey } from '@/entities/org-node/lib/sort-rows'

const SORT_KEYS = ['name', 'level', 'totalHeadcount', 'totalBudget', 'avgPerformance'] as const satisfies readonly SortKey[]

const range = (max?: number) => {
  const bound = max === undefined ? z.number().nonnegative() : z.number().min(0).max(max)
  return z.object({ min: bound.nullable(), max: bound.nullable() })
}

/**
 * Runtime contract of the structured filter from POST /api/search/interpret
 * (mirrors backend/src/models/search-filter.model.ts). Numbers refer to what the table shows:
 * subtree totals and the weighted average performance.
 */
export const searchFilterSchema = z.object({
  nameContains: z.string().min(1).nullable(),
  /** 1 — division, 2 — department, 3 — team; empty — any. */
  levels: z.array(z.union([z.literal(1), z.literal(2), z.literal(3)])),
  totalHeadcount: range(),
  totalBudget: range(),
  avgPerformance: range(100),
  sort: z.object({ key: z.enum(SORT_KEYS), direction: z.enum(['asc', 'desc']) }).nullable(),
  limit: z.number().int().positive().nullable(),
})

export type SearchFilter = z.infer<typeof searchFilterSchema>

export const interpretSearchResponseSchema = z.object({ filter: searchFilterSchema })
export const aiSearchStatusSchema = z.object({ aiEnabled: z.boolean() })
export type AiSearchStatus = z.infer<typeof aiSearchStatusSchema>

export const EMPTY_SEARCH_FILTER: SearchFilter = Object.freeze({
  nameContains: null,
  levels: [],
  totalHeadcount: { min: null, max: null },
  totalBudget: { min: null, max: null },
  avgPerformance: { min: null, max: null },
  sort: null,
  limit: null,
})
