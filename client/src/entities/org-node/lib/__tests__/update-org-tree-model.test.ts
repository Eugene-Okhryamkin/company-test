import { describe, expect, it, vi } from 'vitest'
import * as aggregateModule from '@/entities/org-node/lib/aggregate-org-tree'
import { buildOrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { updateOrgTreeModel } from '@/entities/org-node/lib/update-org-tree-model'
import type { OrgNode } from '@/entities/org-node/model/org-node.schema'
import { sampleOrgNodes } from '@/test/fixtures'

const change = (nodes: OrgNode[], id: string, fields: Partial<OrgNode>) =>
  nodes.map((n) => (n.id === id ? { ...n, ...fields } : n))

describe('updateOrgTreeModel (incremental)', () => {
  it('produces exactly the same model as a full rebuild', () => {
    const before = buildOrgTreeModel(sampleOrgNodes)
    const next = change(sampleOrgNodes, 'd1-1-1', { headcount: 20, budget: 3_000_000, performance: 77.3 })
    const changed = next.filter((n) => n.id === 'd1-1-1')

    const incremental = updateOrgTreeModel(before, changed)

    expect(incremental).toEqual(buildOrgTreeModel(next))
  })

  it('matches a full rebuild after many random patches', () => {
    let nodes = sampleOrgNodes
    let model = buildOrgTreeModel(nodes)
    let seed = 42
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

    for (let step = 0; step < 200; step += 1) {
      const picked = [...new Set([0, 1].map(() => nodes[Math.floor(random() * nodes.length)]!.id))]
      nodes = picked.reduce(
        (acc, id) =>
          change(acc, id, {
            headcount: Math.floor(random() * 30),
            budget: Math.round(random() * 5e6),
            performance: Math.round(random() * 1000) / 10,
          }),
        nodes,
      )
      model = updateOrgTreeModel(model, nodes.filter((n) => picked.includes(n.id)))
    }

    expect(model).toEqual(buildOrgTreeModel(nodes))
  })

  it('recomputes stats only for the changed node and its ancestors (no full aggregation)', () => {
    const before = buildOrgTreeModel(sampleOrgNodes)
    const aggregate = vi.spyOn(aggregateModule, 'aggregateOrgTree')
    const stats = vi.spyOn(aggregateModule, 'computeUnitStats')

    updateOrgTreeModel(before, [{ ...sampleOrgNodes[2]!, headcount: 1 }]) // d1-1-1 → d1-1 → d1

    expect(aggregate).not.toHaveBeenCalled()
    expect(stats).toHaveBeenCalledTimes(3)
  })

  it('keeps references of everything outside the changed path', () => {
    const before = buildOrgTreeModel(sampleOrgNodes)
    const after = updateOrgTreeModel(before, [{ ...sampleOrgNodes[2]!, headcount: 1 }])

    // other division untouched
    expect(after.forest[1]).toBe(before.forest[1])
    expect(after.stats.get('d2')).toBe(before.stats.get('d2'))
    // sibling branch inside the same division untouched
    expect(after.byId.get('d1-2')).toBe(before.byId.get('d1-2'))
    expect(after.rows.find((r) => r.id === 'd1-2')).toBe(before.rows.find((r) => r.id === 'd1-2'))
    // path is new
    expect(after.forest[0]).not.toBe(before.forest[0])
    expect(after.byId.get('d1-1')).not.toBe(before.byId.get('d1-1'))
    expect(after.rows.find((r) => r.id === 'd1')).not.toBe(before.rows.find((r) => r.id === 'd1'))
    // the previous model is not mutated
    expect(before).toEqual(buildOrgTreeModel(sampleOrgNodes))
  })

  it('returns the same model for an empty change list', () => {
    const model = buildOrgTreeModel(sampleOrgNodes)
    expect(updateOrgTreeModel(model, [])).toBe(model)
  })

  it('throws for a node that is not part of the model', () => {
    const model = buildOrgTreeModel(sampleOrgNodes)
    expect(() => updateOrgTreeModel(model, [{ ...sampleOrgNodes[0]!, id: 'ghost' }])).toThrow(/ghost/)
  })
})
