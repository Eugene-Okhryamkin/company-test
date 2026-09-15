import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchOrgTree } from '@/entities/org-node/api/org-tree.api'
import { getOrgTreeModel } from '@/entities/org-node/lib/org-tree-model'

export const orgTreeQueryKey = ['org-tree'] as const

export const orgTreeQueryOptions = queryOptions({
  queryKey: orgTreeQueryKey,
  // Passing TanStack's signal lets it abort the request when no component needs it any more.
  queryFn: ({ signal }) => fetchOrgTree(signal),
})

/** Raw flat list as returned by the API. */
export const useOrgTreeQuery = () => useQuery(orgTreeQueryOptions)

/**
 * Derived model (forest, aggregates, table rows). `getOrgTreeModel` is memoised by data reference,
 * so aggregation runs once per real data change and all consumers share the same object.
 */
export const useOrgTreeModelQuery = () => useQuery({ ...orgTreeQueryOptions, select: getOrgTreeModel })
