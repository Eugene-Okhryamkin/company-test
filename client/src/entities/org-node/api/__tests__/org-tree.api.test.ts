import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrgTree, ORG_TREE_URL } from '@/entities/org-node/api/org-tree.api'
import { makeOrgNode, sampleOrgNodes } from '@/test/fixtures'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

describe('fetchOrgTree', () => {
  it('loads the org tree from the API', async () => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes))
    const { signal } = new AbortController()

    await expect(fetchOrgTree(signal)).resolves.toEqual(sampleOrgNodes)
    expect(ORG_TREE_URL).toBe('/api/org-tree')
    expect(fetchMock).toHaveBeenCalledWith('/api/org-tree', expect.objectContaining({ signal }))
  })

  it('treats a response that breaks the contract as an error', async () => {
    fetchMock.mockResolvedValue(Response.json([makeOrgNode({ performance: 150 })]))

    await expect(fetchOrgTree(new AbortController().signal)).rejects.toMatchObject({ kind: 'validation' })
  })
})
