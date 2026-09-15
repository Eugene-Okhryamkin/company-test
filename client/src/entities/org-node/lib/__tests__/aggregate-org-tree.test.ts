import { describe, expect, it } from 'vitest'
import { aggregateOrgTree } from '@/entities/org-node/lib/aggregate-org-tree'
import { buildOrgTree } from '@/entities/org-node/lib/build-org-tree'
import { makeOrgNode, sampleOrgNodes } from '@/test/fixtures'

const aggregate = (nodes = sampleOrgNodes) => aggregateOrgTree(buildOrgTree(nodes))

describe('aggregateOrgTree', () => {
  it('returns stats for every node', () => {
    expect([...aggregate().keys()].sort()).toEqual(sampleOrgNodes.map((n) => n.id).sort())
  })

  it('uses the node’s own values for a leaf', () => {
    expect(aggregate().get('d1-1-1')).toEqual({
      totalHeadcount: 9,
      totalBudget: 1_000_000,
      avgPerformance: 40,
      performanceWeight: 360,
      performanceSum: 40,
      nodeCount: 1,
    })
  })

  it('sums headcount and budget over the node and all its descendants', () => {
    const stats = aggregate()
    // d1 (4) + d1-1 (3) + d1-1-1 (9) + d1-2 (5)
    expect(stats.get('d1')).toMatchObject({ totalHeadcount: 21, totalBudget: 4_000_000, nodeCount: 4 })
    expect(stats.get('d1-1')).toMatchObject({ totalHeadcount: 12, totalBudget: 2_000_000, nodeCount: 2 })
    expect(stats.get('d2')).toMatchObject({ totalHeadcount: 5, totalBudget: 2_000_000, nodeCount: 2 })
  })

  it('weights average performance by headcount across the subtree', () => {
    const stats = aggregate()
    // (3·65 + 9·40) / 12
    expect(stats.get('d1-1')!.avgPerformance).toBeCloseTo(46.25, 10)
    // (4·82 + 3·65 + 9·40 + 5·90) / 21
    expect(stats.get('d1')!.avgPerformance).toBeCloseTo(1333 / 21, 10)
    // (3·55 + 2·75) / 5
    expect(stats.get('d2')!.avgPerformance).toBeCloseTo(63, 10)
  })

  it('does not let a big low-performing team be outweighed by a tiny manager node', () => {
    const nodes = [
      makeOrgNode({ id: 'boss', headcount: 1, performance: 100 }),
      makeOrgNode({ id: 'team', parentId: 'boss', headcount: 99, performance: 0 }),
    ]
    expect(aggregate(nodes).get('boss')!.avgPerformance).toBeCloseTo(1, 10)
  })

  it('falls back to a plain mean when a subtree has no employees', () => {
    const nodes = [
      makeOrgNode({ id: 'r', headcount: 0, performance: 80 }),
      makeOrgNode({ id: 'c', parentId: 'r', headcount: 0, performance: 40 }),
    ]
    expect(aggregate(nodes).get('r')).toMatchObject({ totalHeadcount: 0, avgPerformance: 60 })
  })

  it('ignores zero-headcount nodes in the weighted average when others have employees', () => {
    const nodes = [
      makeOrgNode({ id: 'r', headcount: 0, performance: 0 }),
      makeOrgNode({ id: 'c', parentId: 'r', headcount: 10, performance: 70 }),
    ]
    expect(aggregate(nodes).get('r')!.avgPerformance).toBe(70)
  })

  it('handles an empty forest', () => {
    expect(aggregateOrgTree([]).size).toBe(0)
  })

  it('handles deep trees without recursion limits', () => {
    const depth = 20_000
    const nodes = Array.from({ length: depth }, (_, i) =>
      makeOrgNode({ id: `n${i}`, parentId: i === 0 ? null : `n${i - 1}`, headcount: 1, budget: 1, performance: 50 }),
    )
    const stats = aggregate(nodes)
    expect(stats.get('n0')).toMatchObject({ totalHeadcount: depth, totalBudget: depth, avgPerformance: 50 })
  })
})
