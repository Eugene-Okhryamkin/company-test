import { describe, expect, it, vi } from 'vitest'
import { orgTreeQueryKey } from '@/entities/org-node/api/org-tree.query'
import * as aggregateModule from '@/entities/org-node/lib/aggregate-org-tree'
import { getOrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { applyOrgTreePatch } from '@/entities/org-node/live/apply-org-tree-patch'
import { getDataVersion, setDataVersion } from '@/entities/org-node/live/data-version'
import type { OrgNode } from '@/entities/org-node/model/org-node.schema'
import { createQueryClient } from '@/shared/api/query-client'
import { sampleOrgNodes } from '@/test/fixtures'

const at = '2026-09-15T10:00:00.000Z'
const patch = (version: number, nodes: { id: string; headcount?: number; budget?: number; performance?: number }[]) => ({
  type: 'patch' as const,
  version,
  nodes: nodes.map((n) => {
    const base = sampleOrgNodes.find((s) => s.id === n.id) ?? sampleOrgNodes[0]!
    return { headcount: base.headcount, budget: base.budget, performance: base.performance, updatedAt: at, ...n }
  }),
})

function clientWithSnapshot(version = 10) {
  const client = createQueryClient()
  const data = [...sampleOrgNodes]
  setDataVersion(data, version)
  client.setQueryData(orgTreeQueryKey, data)
  return { client, data: client.getQueryData<OrgNode[]>(orgTreeQueryKey)! }
}

describe('applyOrgTreePatch', () => {
  it('applies the next version into the cache without refetching', () => {
    const { client } = clientWithSnapshot(10)
    const fetchSpy = vi.spyOn(client, 'fetchQuery')

    expect(applyOrgTreePatch(client, patch(11, [{ id: 'd1-1', headcount: 30, performance: 99.9 }]))).toBe('applied')

    const data = client.getQueryData<OrgNode[]>(orgTreeQueryKey)!
    expect(data.find((n) => n.id === 'd1-1')).toMatchObject({ headcount: 30, performance: 99.9, updatedAt: at })
    expect(getDataVersion(data)).toBe(11)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps unchanged nodes as the same objects', () => {
    const { client, data: before } = clientWithSnapshot()

    applyOrgTreePatch(client, patch(11, [{ id: 'd1-1', headcount: 30 }]))

    const after = client.getQueryData<OrgNode[]>(orgTreeQueryKey)!
    expect(after).not.toBe(before)
    expect(after[0]).toBe(before[0])
    expect(after[1]).not.toBe(before[1])
  })

  it('updates the derived model incrementally when it was already computed', () => {
    const { client, data } = clientWithSnapshot()
    getOrgTreeModel(data)
    const aggregate = vi.spyOn(aggregateModule, 'aggregateOrgTree')

    applyOrgTreePatch(client, patch(11, [{ id: 'd1-1-1', headcount: 19 }]))
    const model = getOrgTreeModel(client.getQueryData<OrgNode[]>(orgTreeQueryKey)!)

    expect(aggregate).not.toHaveBeenCalled()
    expect(model.stats.get('d1')!.totalHeadcount).toBe(31) // 21 − 9 + 19
  })

  it('ignores patches that are already contained in the snapshot', () => {
    const { client, data } = clientWithSnapshot(10)

    expect(applyOrgTreePatch(client, patch(10, [{ id: 'd1', headcount: 1 }]))).toBe('ignored')
    expect(applyOrgTreePatch(client, patch(3, [{ id: 'd1', headcount: 1 }]))).toBe('ignored')
    expect(client.getQueryData(orgTreeQueryKey)).toBe(data)
  })

  it('asks for a resync when versions were missed', () => {
    const { client, data } = clientWithSnapshot(10)

    expect(applyOrgTreePatch(client, patch(12, [{ id: 'd1', headcount: 1 }]))).toBe('resync')
    expect(client.getQueryData(orgTreeQueryKey)).toBe(data)
  })

  it('asks for a resync when the patch references an unknown node', () => {
    const { client } = clientWithSnapshot(10)
    expect(applyOrgTreePatch(client, patch(11, [{ id: 'ghost', headcount: 1 }]))).toBe('resync')
  })

  it('ignores patches while there is no snapshot or its version is unknown', () => {
    expect(applyOrgTreePatch(createQueryClient(), patch(1, [{ id: 'd1' }]))).toBe('ignored')

    const client = createQueryClient()
    client.setQueryData(orgTreeQueryKey, [...sampleOrgNodes])
    expect(applyOrgTreePatch(client, patch(1, [{ id: 'd1' }]))).toBe('resync')
  })

  it('applies consecutive patches', () => {
    const { client } = clientWithSnapshot(10)
    applyOrgTreePatch(client, patch(11, [{ id: 'd1', headcount: 1 }]))
    expect(applyOrgTreePatch(client, patch(12, [{ id: 'd1', headcount: 2 }]))).toBe('applied')
    expect(client.getQueryData<OrgNode[]>(orgTreeQueryKey)!.find((n) => n.id === 'd1')!.headcount).toBe(2)
  })
})
