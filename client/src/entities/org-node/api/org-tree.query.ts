import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchOrgTree } from '@/entities/org-node/api/org-tree.api'

export const orgTreeQueryKey = ['org-tree'] as const

export const orgTreeQueryOptions = queryOptions({
  queryKey: orgTreeQueryKey,
  // Passing TanStack's signal lets it abort the request when no component needs it any more.
  queryFn: ({ signal }) => fetchOrgTree(signal),
})

export const useOrgTreeQuery = () => useQuery(orgTreeQueryOptions)
