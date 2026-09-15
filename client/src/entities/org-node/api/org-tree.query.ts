import { queryOptions, replaceEqualDeep, useQuery } from '@tanstack/react-query'
import { fetchOrgTree } from '@/entities/org-node/api/org-tree.api'
import { getOrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { getDataVersion, setDataVersion } from '@/entities/org-node/live/data-version'
import type { OrgNode } from '@/entities/org-node/model/org-node.schema'

export const orgTreeQueryKey = ['org-tree'] as const

/** Data arrays produced by live patches: already structurally shared, stored as-is. */
const patchedSnapshots = new WeakSet<readonly OrgNode[]>()
export const markPatchedSnapshot = (nodes: readonly OrgNode[]) => patchedSnapshots.add(nodes)

/**
 * Structural sharing that
 * - stores patched arrays untouched (their incrementally updated model is keyed by that identity);
 * - otherwise keeps unchanged parts by reference (TanStack's replaceEqualDeep),
 *   carrying the fresh data version over to the kept reference.
 */
function shareOrgTree(previous: unknown, next: unknown): unknown {
  const nextNodes = next as OrgNode[]
  if (patchedSnapshots.has(nextNodes)) return nextNodes
  const shared = replaceEqualDeep(previous, next) as OrgNode[]
  const version = getDataVersion(nextNodes)
  if (shared !== nextNodes && version !== undefined) setDataVersion(shared, version)
  return shared
}

export const orgTreeQueryOptions = queryOptions({
  queryKey: orgTreeQueryKey,
  // Passing TanStack's signal lets it abort the request when no component needs it any more.
  queryFn: ({ signal }) => fetchOrgTree(signal),
  structuralSharing: shareOrgTree,
})

/** Raw flat list as returned by the API. */
export const useOrgTreeQuery = () => useQuery(orgTreeQueryOptions)

/**
 * Derived model (forest, aggregates, table rows). `getOrgTreeModel` is memoised by data reference,
 * so aggregation runs once per real data change and all consumers share the same object.
 */
export const useOrgTreeModelQuery = () => useQuery({ ...orgTreeQueryOptions, select: getOrgTreeModel })
