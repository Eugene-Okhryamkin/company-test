import { setDataVersion } from '@/entities/org-node/live/data-version'
import { orgTreeResponseSchema, type OrgNode } from '@/entities/org-node/model/org-node.schema'
import { getJson } from '@/shared/api/http-client'

export const ORG_TREE_URL = '/api/org-tree'
export const DATA_VERSION_HEADER = 'X-Data-Version'

export async function fetchOrgTree(signal: AbortSignal): Promise<OrgNode[]> {
  let version: number | undefined
  const nodes = await getJson(ORG_TREE_URL, orgTreeResponseSchema, {
    signal,
    onResponse: (response) => {
      const header = response.headers.get(DATA_VERSION_HEADER)
      if (header !== null && /^\d+$/.test(header)) version = Number(header)
    },
  })
  if (version !== undefined) setDataVersion(nodes, version)
  return nodes
}
