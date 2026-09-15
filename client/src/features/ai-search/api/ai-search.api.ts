import { useMutation, useQuery } from '@tanstack/react-query'
import {
  aiSearchStatusSchema,
  interpretSearchResponseSchema,
  type AiSearchStatus,
  type SearchFilter,
} from '@/features/ai-search/model/search-filter.schema'
import { getJson, postJson } from '@/shared/api/http-client'

export const AI_SEARCH_STATUS_URL = '/api/search/status'
export const AI_SEARCH_INTERPRET_URL = '/api/search/interpret'

export const aiSearchStatusQueryKey = ['ai-search', 'status'] as const

export const fetchAiSearchStatus = (signal: AbortSignal): Promise<AiSearchStatus> =>
  getJson(AI_SEARCH_STATUS_URL, aiSearchStatusSchema, { signal })

export async function interpretSearchQuery(query: string): Promise<SearchFilter> {
  const { filter } = await postJson(AI_SEARCH_INTERPRET_URL, { query }, interpretSearchResponseSchema)
  return filter
}

/** Whether the backend has an LLM configured. Rarely changes → cached for a minute. */
export const useAiSearchStatusQuery = () =>
  useQuery({
    queryKey: aiSearchStatusQueryKey,
    queryFn: ({ signal }) => fetchAiSearchStatus(signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

export const useInterpretSearchMutation = () => useMutation({ mutationFn: interpretSearchQuery })
