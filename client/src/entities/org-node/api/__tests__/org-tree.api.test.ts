import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchOrgTree, ORG_TREE_URL } from '@/entities/org-node/api/org-tree.api'
import { getDataVersion } from '@/entities/org-node/live/data-version'
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

  it('remembers the snapshot version from the X-Data-Version header', async () => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes, { headers: { 'X-Data-Version': '42' } }))

    const nodes = await fetchOrgTree(new AbortController().signal)

    expect(getDataVersion(nodes)).toBe(42)
  })

  it('leaves the version unknown when the header is missing or invalid', async () => {
    fetchMock.mockResolvedValue(Response.json(sampleOrgNodes, { headers: { 'X-Data-Version': 'abc' } }))
    expect(getDataVersion(await fetchOrgTree(new AbortController().signal))).toBeUndefined()
  })

  it('treats a response that breaks the contract as an error', async () => {
    fetchMock.mockResolvedValue(Response.json([makeOrgNode({ performance: 150 })]))

    await expect(fetchOrgTree(new AbortController().signal)).rejects.toMatchObject({ kind: 'validation' })
  })
})
