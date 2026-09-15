import type { QueryClient } from '@tanstack/react-query'
import { markPatchedSnapshot, orgTreeQueryKey } from '@/entities/org-node/api/org-tree.query'
import { peekOrgTreeModel, primeOrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { updateOrgTreeModel } from '@/entities/org-node/lib/update-org-tree-model'
import { getDataVersion, setDataVersion } from '@/entities/org-node/live/data-version'
import type { PatchMessage } from '@/entities/org-node/live/live-message.schema'
import type { OrgNode } from '@/entities/org-node/model/org-node.schema'

/**
 * - applied: patch merged into the cache;
 * - ignored: nothing to do (no snapshot yet, or the snapshot already contains this version);
 * - resync:  the cache cannot be patched safely (missed versions, unknown node) → refetch the snapshot.
 */
export type PatchResult = 'applied' | 'ignored' | 'resync'

export function applyOrgTreePatch(client: QueryClient, message: PatchMessage): PatchResult {
  const current = client.getQueryData<OrgNode[]>(orgTreeQueryKey)
  if (!current) return 'ignored'

  const currentVersion = getDataVersion(current)
  if (currentVersion === undefined) return 'resync'
  if (message.version <= currentVersion) return 'ignored'
  if (message.version !== currentVersion + 1) return 'resync'

  const patchById = new Map(message.nodes.map((node) => [node.id, node]))
  const changed: OrgNode[] = []
  const next = current.map((node) => {
    const patch = patchById.get(node.id)
    if (!patch) return node
    const updated = { ...node, ...patch }
    changed.push(updated)
    return updated
  })
  if (changed.length !== patchById.size) return 'resync'

  // Recalculate aggregates only along the changed paths, if the model is already in use.
  const previousModel = peekOrgTreeModel(current)
  const nextModel = previousModel ? updateOrgTreeModel(previousModel, changed) : undefined
  const register = (nodes: readonly OrgNode[]) => {
    setDataVersion(nodes, message.version)
    if (nextModel) primeOrgTreeModel(nodes, nextModel)
  }

  register(next)
  markPatchedSnapshot(next)
  client.setQueryData(orgTreeQueryKey, next)

  // Without an observer carrying our query options the cache may store a structurally shared copy;
  // keep version and model attached to whatever reference is actually stored.
  const stored = client.getQueryData<OrgNode[]>(orgTreeQueryKey)
  if (stored && stored !== next) register(stored)
  return 'applied'
}
