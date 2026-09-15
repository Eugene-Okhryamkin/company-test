import { describe, expect, it } from 'vitest'
import { parseLiveMessage } from '@/entities/org-node/live/live-message.schema'

const patchNode = { id: 'd1', headcount: 5, budget: 100, performance: 81.5, updatedAt: '2026-09-15T10:00:00.000Z' }

describe('parseLiveMessage', () => {
  it.each([
    [{ type: 'hello', version: 3, heartbeatIntervalMs: 15000 }],
    [{ type: 'heartbeat', version: 3 }],
    [{ type: 'patch', version: 4, nodes: [patchNode] }],
  ])('accepts %j', (message) => {
    expect(parseLiveMessage(JSON.stringify(message))).toEqual(message)
  })

  it.each([
    ['not json', '{'],
    ['unknown type', JSON.stringify({ type: 'bye', version: 1 })],
    ['negative version', JSON.stringify({ type: 'heartbeat', version: -1 })],
    ['fractional version', JSON.stringify({ type: 'heartbeat', version: 1.5 })],
    ['invalid metric', JSON.stringify({ type: 'patch', version: 1, nodes: [{ ...patchNode, performance: 120 }] })],
    ['missing updatedAt', JSON.stringify({ type: 'patch', version: 1, nodes: [{ id: 'd1', headcount: 1, budget: 1, performance: 1 }] })],
  ])('rejects %s', (_label, raw) => {
    expect(parseLiveMessage(raw)).toBeNull()
  })
})
