import { z } from 'zod'
import { orgNodeSchema } from '@/entities/org-node/model/org-node.schema'

const version = z.number().int().nonnegative()

/** One changed node in a patch: id + all live metrics + new updatedAt. */
export const orgNodePatchSchema = orgNodeSchema.pick({
  id: true,
  headcount: true,
  budget: true,
  performance: true,
  updatedAt: true,
})

/** Server → client messages on /api/live. */
export const liveMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), version, heartbeatIntervalMs: z.number().int().positive() }),
  z.object({ type: z.literal('heartbeat'), version }),
  z.object({ type: z.literal('patch'), version, nodes: z.array(orgNodePatchSchema) }),
])

export type OrgNodePatch = z.infer<typeof orgNodePatchSchema>
export type LiveMessage = z.infer<typeof liveMessageSchema>
export type PatchMessage = Extract<LiveMessage, { type: 'patch' }>

/** Parses and validates a raw WebSocket frame; anything invalid → null. */
export function parseLiveMessage(raw: string): LiveMessage | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const result = liveMessageSchema.safeParse(json)
  return result.success ? result.data : null
}
