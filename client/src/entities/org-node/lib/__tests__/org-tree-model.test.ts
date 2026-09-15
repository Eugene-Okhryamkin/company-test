import { describe, expect, it, vi } from 'vitest'
import * as aggregateModule from '@/entities/org-node/lib/aggregate-org-tree'
import { buildOrgTreeModel, getAncestorIds, getOrgTreeModel } from '@/entities/org-node/lib/org-tree-model'
import { sampleOrgNodes } from '@/test/fixtures'

describe('buildOrgTreeModel', () => {
  it('exposes the forest, a node index and aggregated stats', () => {
    const model = buildOrgTreeModel(sampleOrgNodes)

    expect(model.forest.map((t) => t.node.id)).toEqual(['d1', 'd2'])
    expect(model.byId.get('d1-1-1')!.level).toBe(3)
    expect(model.stats.get('d1')!.totalHeadcount).toBe(21)
  })

  it('builds table rows in hierarchy (depth-first) order with level and aggregates', () => {
    const { rows } = buildOrgTreeModel(sampleOrgNodes)

    expect(rows.map((r) => r.id)).toEqual(['d1', 'd1-1', 'd1-1-1', 'd1-2', 'd2', 'd2-1'])
    expect(rows.map((r) => r.order)).toEqual([0, 1, 2, 3, 4, 5])
    expect(rows[0]).toEqual({
      id: 'd1',
      name: 'Технологии',
      level: 1,
      totalHeadcount: 21,
      totalBudget: 4_000_000,
      avgPerformance: 1333 / 21,
      order: 0,
    })
  })

  it('handles empty data', () => {
    expect(buildOrgTreeModel([])).toMatchObject({ forest: [], rows: [] })
  })
})

describe('getOrgTreeModel (memoised)', () => {
  it('computes the model once per data reference', () => {
    const spy = vi.spyOn(aggregateModule, 'aggregateOrgTree')
    const data = [...sampleOrgNodes]

    const first = getOrgTreeModel(data)
    const second = getOrgTreeModel(data)

    expect(second).toBe(first)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('recomputes for a new data reference', () => {
    const a = getOrgTreeModel([...sampleOrgNodes])
    const b = getOrgTreeModel([...sampleOrgNodes])
    expect(b).not.toBe(a)
  })
})

describe('getAncestorIds', () => {
  it('lists ancestors from the root down to the direct parent', () => {
    const model = buildOrgTreeModel(sampleOrgNodes)
    expect(getAncestorIds(model, 'd1-1-1')).toEqual(['d1', 'd1-1'])
    expect(getAncestorIds(model, 'd1')).toEqual([])
    expect(getAncestorIds(model, 'missing')).toEqual([])
  })
})
