import type { OrgNode } from '@/entities/org-node/model/org-node.schema'

/**
 * Server data version attached to a cached data array by identity (the API contract stays a plain
 * array). Set from the X-Data-Version header on fetch and from patch versions on live updates.
 */
const versions = new WeakMap<readonly OrgNode[], number>()

export const getDataVersion = (nodes: readonly OrgNode[]): number | undefined => versions.get(nodes)

export const setDataVersion = (nodes: readonly OrgNode[], version: number): void => {
  versions.set(nodes, version)
}
