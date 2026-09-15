import { orgTreeResponseSchema, type OrgNode } from '@/entities/org-node/model/org-node.schema'
import { getJson } from '@/shared/api/http-client'

export const ORG_TREE_URL = '/api/org-tree'

export const fetchOrgTree = (signal: AbortSignal): Promise<OrgNode[]> =>
  getJson(ORG_TREE_URL, orgTreeResponseSchema, { signal })
