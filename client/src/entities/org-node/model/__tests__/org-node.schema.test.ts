import { describe, expect, it } from 'vitest'
import { orgTreeResponseSchema } from '@/entities/org-node/model/org-node.schema'
import { makeOrgNode, sampleOrgNodes } from '@/test/fixtures'

const parse = (value: unknown) => orgTreeResponseSchema.safeParse(value)
const issuesOf = (value: unknown) => {
  const result = parse(value)
  expect(result.success).toBe(false)
  return result.error!.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
}

describe('orgTreeResponseSchema', () => {
  it('accepts a valid flat tree', () => {
    expect(parse(sampleOrgNodes)).toEqual({ success: true, data: sampleOrgNodes })
  })

  it('accepts an empty array', () => {
    expect(parse([]).success).toBe(true)
  })

  it('accepts boundary values', () => {
    const nodes = [makeOrgNode({ id: 'a', headcount: 0, budget: 0, performance: 0 }), makeOrgNode({ id: 'b', performance: 100 })]
    expect(parse(nodes).success).toBe(true)
  })

  it.each([null, {}, 'nodes', 42])('rejects a non-array response %j', (value) => {
    expect(parse(value).success).toBe(false)
  })

  it('strips fields outside the contract', () => {
    const result = parse([{ ...makeOrgNode(), secret: 'x' }])
    expect(result.success && result.data[0]).not.toHaveProperty('secret')
  })

  it.each(['id', 'name', 'parentId', 'headcount', 'budget', 'performance', 'updatedAt'] as const)(
    'rejects a node without %s',
    (field) => {
      const node: Record<string, unknown> = { ...makeOrgNode() }
      delete node[field]
      expect(issuesOf([node])).toContain(`0.${field}`)
    },
  )

  it.each([
    ['id', ''],
    ['id', 1],
    ['name', ''],
    ['parentId', 5],
    ['headcount', -1],
    ['headcount', 1.5],
    ['headcount', '10'],
    ['budget', -1],
    ['performance', -1],
    ['performance', 100.5],
    ['updatedAt', 'yesterday'],
  ] as const)('rejects invalid %s = %j', (field, value) => {
    expect(issuesOf([makeOrgNode({ [field]: value } as never)])).toContain(`0.${field}`)
  })

  it('rejects duplicate ids', () => {
    expect(issuesOf([makeOrgNode({ id: 'x' }), makeOrgNode({ id: 'x' })])).toMatch(/duplicate id "x"/)
  })

  it('rejects a reference to an unknown parent', () => {
    expect(issuesOf([makeOrgNode({ id: 'a', parentId: 'ghost' })])).toMatch(/unknown parent "ghost"/)
  })

  it('rejects cycles', () => {
    const nodes = [
      makeOrgNode({ id: 'a', parentId: 'b' }),
      makeOrgNode({ id: 'b', parentId: 'a' }),
    ]
    expect(issuesOf(nodes)).toMatch(/cycle/)
  })
})
