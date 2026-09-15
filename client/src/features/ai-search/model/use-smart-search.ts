import { useRef, useState } from 'react'
import { useAiSearchStatusQuery, useInterpretSearchMutation } from '@/features/ai-search/api/ai-search.api'
import type { SearchFilter } from '@/features/ai-search/model/search-filter.schema'
import { useDebouncedValue } from '@/shared/lib/use-debounced-value'

export const AI_FALLBACK_NOTICE = 'AI-поиск недоступен — показаны результаты поиска по названию'

export interface AppliedAiFilter {
  /** The query the filter was produced for. */
  query: string
  filter: SearchFilter
}

export interface SmartSearch {
  query: string
  /** Debounced query for text search; empty while an AI filter is applied. */
  textQuery: string
  aiFilter: AppliedAiFilter | null
  aiEnabled: boolean
  isInterpreting: boolean
  notice: string | null
  setQuery: (value: string) => void
  /** Explicit submit (Enter / button): ask the LLM to interpret the query. */
  submit: () => void
  reset: () => void
}

interface Options {
  debounceMs: number
  /** Called once when a new AI filter is applied (e.g. to adopt its sort). */
  onAiFilter?: (filter: SearchFilter) => void
}

/**
 * One search box, two modes. Typing filters by name in real time (text search).
 * Submitting sends the query to the LLM; the structured answer replaces text search until the
 * query is edited. Any AI failure leaves text search in place and explains why (fallback).
 */
export function useSmartSearch({ debounceMs, onAiFilter }: Options): SmartSearch {
  const [query, setQueryState] = useState('')
  const [aiFilter, setAiFilter] = useState<AppliedAiFilter | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query, debounceMs)
  const status = useAiSearchStatusQuery()
  const interpret = useInterpretSearchMutation()
  // Identifies the latest request; answers to older ones (the query changed meanwhile) are dropped.
  const requestId = useRef(0)

  const aiEnabled = status.data?.aiEnabled === true
  const trimmed = query.trim()

  const setQuery = (value: string) => {
    requestId.current += 1
    setQueryState(value)
    setAiFilter(null)
    setNotice(null)
  }

  const submit = () => {
    if (!aiEnabled || trimmed === '' || aiFilter?.query === trimmed) return
    const id = ++requestId.current
    setNotice(null)
    interpret.mutate(trimmed, {
      onSuccess: (filter) => {
        if (id !== requestId.current) return
        setAiFilter({ query: trimmed, filter })
        onAiFilter?.(filter)
      },
      onError: () => {
        if (id === requestId.current) setNotice(AI_FALLBACK_NOTICE)
      },
    })
  }

  return {
    query,
    textQuery: aiFilter ? '' : debouncedQuery,
    aiFilter,
    aiEnabled,
    isInterpreting: interpret.isPending && interpret.variables === trimmed,
    notice,
    setQuery,
    submit,
    reset: () => setQuery(''),
  }
}
