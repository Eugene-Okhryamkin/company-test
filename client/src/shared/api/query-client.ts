import { QueryClient, type DefaultOptions } from '@tanstack/react-query'

/** Data is considered fresh for 5 s; after that it is revalidated in the background (SWR). */
export const QUERY_STALE_TIME = 5_000

export const queryDefaults = {
  queries: {
    staleTime: QUERY_STALE_TIME,
    // Failures surface immediately; the UI offers an explicit "Retry".
    retry: false,
    // Revalidate on focus — only when data is already stale.
    refetchOnWindowFocus: true,
    // Unchanged parts of a response keep their references → no needless re-renders.
    structuralSharing: true,
  },
} satisfies DefaultOptions

export const createQueryClient = () => new QueryClient({ defaultOptions: queryDefaults })
