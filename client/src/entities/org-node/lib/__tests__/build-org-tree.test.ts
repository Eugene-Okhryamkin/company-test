import { describe, expect, it } from 'vitest'
import { buildOrgTree, type OrgTreeNode } from '@/entities/org-node/lib/build-org-tree'
import { makeOrgNode, sampleOrgNodes } from '@/test/fixtures'

const shape = (nodes: OrgTreeNode[]): unknown =>
  nodes.map((n) => ({ id: n.node.id, level: n.level, children: shape(n.children) }))

describe('buildOrgTree', () => {
  it('returns an empty forest for no nodes', () => {
    expect(buildOrgTree([])).toEqual([])
  })

  it('nests children under parents and assigns 1-based levels', () => {
    expect(shape(buildOrgTree(sampleOrgNodes))).toEqual([
      {
        id: 'd1',
        level: 1,
        children: [
          { id: 'd1-1', level: 2, children: [{ id: 'd1-1-1', level: 3, children: [] }] },
          { id: 'd1-2', level: 2, children: [] },
        ],
      },
      { id: 'd2', level: 1, children: [{ id: 'd2-1', level: 2, children: [] }] },
    ])
  })

  it('does not depend on parents appearing before children', () => {
    const reversed = [...sampleOrgNodes].reverse()
    const ids = (nodes: OrgTreeNode[]): string[] => nodes.flatMap((n) => [n.node.id, ...ids(n.children)])
    expect(ids(buildOrgTree(reversed)).sort()).toEqual(sampleOrgNodes.map((n) => n.id).sort())
    expect(buildOrgTree(reversed).map((n) => n.level)).toEqual([1, 1])
  })

  it('keeps sibling order from the input', () => {
    const nodes = [makeOrgNode({ id: 'r' }), makeOrgNode({ id: 'b', parentId: 'r' }), makeOrgNode({ id: 'a', parentId: 'r' })]
    expect(buildOrgTree(nodes)[0]!.children.map((c) => c.node.id)).toEqual(['b', 'a'])
  })

  it('keeps references to the original node objects and does not mutate input', () => {
    const input = sampleOrgNodes.map((n) => ({ ...n }))
    const snapshot = structuredClone(input)
    const tree = buildOrgTree(input)
    expect(tree[0]!.node).toBe(input[0])
    expect(input).toEqual(snapshot)
  })
})
