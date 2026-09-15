import { z } from 'zod'

/** Runtime contract of one item of GET /api/org-tree. */
export const orgNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  headcount: z.number().int().nonnegative(),
  budget: z.number().nonnegative(),
  performance: z.number().min(0).max(100),
  updatedAt: z.iso.datetime(),
})

export type OrgNode = z.infer<typeof orgNodeSchema>

/**
 * Whole response: a flat list that must form a valid forest
 * (unique ids, existing parents, no cycles) — otherwise the tree cannot be built.
 */
export const orgTreeResponseSchema = z.array(orgNodeSchema).superRefine((nodes, ctx) => {
  const parentById = new Map<string, string | null>()

  nodes.forEach((node, index) => {
    if (parentById.has(node.id)) {
      ctx.addIssue({ code: 'custom', path: [index, 'id'], message: `duplicate id "${node.id}"` })
    }
    parentById.set(node.id, node.parentId)
  })

  nodes.forEach((node, index) => {
    if (node.parentId !== null && !parentById.has(node.parentId)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'parentId'],
        message: `unknown parent "${node.parentId}"`,
      })
    }
  })

  const reachesRoot = new Set<string>()
  nodes.forEach((node, index) => {
    const path = new Set<string>()
    let current: string | null | undefined = node.id
    while (current != null && !reachesRoot.has(current)) {
      if (path.has(current)) {
        ctx.addIssue({ code: 'custom', path: [index, 'parentId'], message: `cycle detected at "${current}"` })
        return
      }
      path.add(current)
      current = parentById.get(current)
    }
    path.forEach((id) => reachesRoot.add(id))
  })
})
